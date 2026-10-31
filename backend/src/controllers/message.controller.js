import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io, sendBotReply, setChatList } from "../lib/socket.js";
import {
  findConversation, getLatestConversation, getSupportContact, startConversation, touchConversation,
} from "../lib/conversations.js";
import { storeDb as ecommerceDB } from "../lib/store.js";
import { getOrderSellerEmails } from "../lib/storeOrders.js";

// ── Notify ecommerce admin ─────────────────────────────────────────────────
async function notifyEcommerceAdmin(senderName, messageText) {
  try {
    const [admins] = await ecommerceDB.query(
      "SELECT user_id FROM users WHERE role IN ('admin', 'super_admin')"
    );
    if (admins.length === 0) return;

    const notifMessage = `💬 Live Chat: ${senderName} says — "${messageText.slice(0, 80)}${messageText.length > 80 ? '...' : ''}"`;

    for (const admin of admins) {
      await ecommerceDB.query(
        "INSERT INTO notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, NOW())",
        [admin.user_id, notifMessage]
      );
    }
    console.log(`Notified ${admins.length} admin(s) in ecommerce.`);
  } catch (err) {
    console.error("Failed to notify ecommerce admin:", err.message);
  }
}

// ── Fetch products from ecommerce ──────────────────────────────────────────
async function getEcommerceProducts() {
  try {
    const res  = await fetch("http://localhost/ecommerce/get-products-for-bot.php");
    const data = await res.json();
    return data.success ? data.products : [];
  } catch (err) {
    console.error("Failed to fetch products:", err.message);
    return [];
  }
}

// ── Analyze image using colors ─────────────────────────────────────────────
async function analyzeImageAndFindProducts(imageUrl) {
  try {
    console.log("Analyzing image...");

    const result = await cloudinary.uploader.upload(imageUrl, {
      colors:         true,
      image_metadata: true,
    });

    const colors = (result.colors || []).map(c => c[0].toLowerCase());
    console.log("Detected colors:", colors);

    const products = await getEcommerceProducts();

    const colorKeywords = {
      "black":  ["black", "dark", "charcoal"],
      "white":  ["white", "light", "pearl"],
      "red":    ["red", "rose", "crimson"],
      "blue":   ["blue", "navy", "indigo", "aqua"],
      "green":  ["green", "olive", "mint"],
      "yellow": ["yellow", "gold", "amber"],
      "brown":  ["brown", "wood", "leather"],
      "gray":   ["gray", "grey", "silver"],
      "pink":   ["pink", "rose", "blush"],
      "purple": ["purple", "violet", "lavender"],
    };

    const searchTerms = [];
    for (const color of colors.slice(0, 3)) {
      for (const [key, variants] of Object.entries(colorKeywords)) {
        if (variants.some(v => color.includes(v))) {
          searchTerms.push(key);
        }
      }
    }

    console.log("Search terms from image:", searchTerms);

    const matched = products.filter(p => {
      const productName = p.name.toLowerCase();
      const productCat  = (p.category || "").toLowerCase();
      return searchTerms.some(term =>
        productName.includes(term) || productCat.includes(term)
      );
    });

    const finalProducts = matched.length > 0 ? matched : products.slice(0, 5);

    return {
      tags:      searchTerms.length > 0 ? searchTerms : ["various colors"],
      products:  finalProducts,
      isExact:   matched.length > 0,
    };
  } catch (err) {
    console.error("Image analysis error:", err.message);
    return { tags: [], products: [], isExact: false };
  }
}

// ── Format image search results ────────────────────────────────────────────
function formatImageSearchResults(tags, products, isExact) {
  let msg = `📸 I analyzed your image!\n`;

  if (tags.length > 0 && tags[0] !== "various colors") {
    msg += `🎨 Detected colors: ${tags.join(", ")}\n\n`;
  }

  if (!isExact) {
    msg += `😊 I couldn't find an exact match but here are our top products:\n\n`;
  } else {
    msg += `✅ Here are similar products I found:\n\n`;
  }

  products.forEach((p, i) => {
    msg += `${i + 1}. ${p.name}\n`;
    msg += `   🏪 ${p.store}\n`;
    msg += `   💰 ₱${p.price} | 📦 ${p.status}\n`;
    msg += `   🔗 ${p.link}\n\n`;
  });

  return msg;
}

// ── Bot: a photo in the assistant's chat gets similar products, saved in the same chat ──
function replyToPhoto(userId, conversationId, imageUrl) {
  setTimeout(async () => {
    try {
      const socketId = getReceiverSocketId(String(userId));
      if (socketId) io.to(socketId).emit("botTyping", true);

      const { tags, products, isExact } = await analyzeImageAndFindProducts(imageUrl);
      const botReply = formatImageSearchResults(tags, products, isExact);

      if (socketId) io.to(socketId).emit("botTyping", false);
      await sendBotReply(socketId, userId, conversationId, botReply);
    } catch (err) {
      console.error("Image bot error:", err.message);
    }
  }, 1500);
}

// ── CONTROLLERS ────────────────────────────────────────────────────────────

// Everyone this user has sent a message to or received one from
async function getChatPartnerIds(userId) {
  const [sentTo, receivedFrom] = await Promise.all([
    Message.distinct("receiverId", { senderId: userId }),
    Message.distinct("senderId", { receiverId: userId }),
  ]);
  return [...sentTo, ...receivedFrom].filter((id) => mongoose.isValidObjectId(id));
}

// Only what the chat list shows: whatever the page receives can be read in the browser's dev tools,
// so no emails or account dates
const CHAT_LIST_FIELDS = "fullName profilePic role";

// Admins (support and sellers) see everyone, so they can answer buyers.
// Buyers only see support, people they already chat with, and the stores they ordered from.
// isSupport marks the support contact, whose chat is the one the bot answers in.
export const getUsersForSidebar = async (req, res) => {
  try {
    const me = req.user;
    const support = await getSupportContact();
    const isSupport = (user) => Boolean(support && user._id.equals(support._id));

    if (me.role === "admin") {
      const users = await User.find({ _id: { $ne: me._id } }).select(CHAT_LIST_FIELDS).sort({ createdAt: 1 });
      return res.status(200).json(users.map((user) => ({ ...user.toObject(), isSupport: isSupport(user) })));
    }

    const [partnerIds, sellerEmails] = await Promise.all([
      getChatPartnerIds(me._id),
      // The store database may be offline; the list still loads without the stores
      getOrderSellerEmails(me.email).catch((error) => {
        console.log("Store sellers unavailable for chats:", error.message);
        return [];
      }),
    ]);
    const users = await User.find({
      _id: { $ne: me._id },
      $or: [
        { _id: { $in: [support?._id, ...partnerIds].filter(Boolean) } },
        { email: { $in: sellerEmails } },
      ],
    })
      .collation({ locale: "en", strength: 2 }) // store and chat emails may differ in case
      .select(CHAT_LIST_FIELDS)
      .sort({ createdAt: 1 });
    // Their sockets get online statuses for these people only
    setChatList(String(me._id), users.map((user) => user._id));
    res.status(200).json(users.map((user) => ({ ...user.toObject(), isSupport: isSupport(user) })));
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// A chat with one person: what each sent the other. (The assistant's chats load per chat: routes/conversation.route.js)
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    if (!mongoose.isValidObjectId(userToChatId)) return res.status(404).json({ message: "User not found" });
    const myId = req.user._id;
    // senderId can hold "bot", so Mongoose doesn't cast it: a string id there would match nothing
    const otherId = new mongoose.Types.ObjectId(userToChatId);
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// conversationId: in the assistant's chat, the chat the user has open (none: the message starts a new chat)
export const sendMessage = async (req, res) => {
  try {
    const { text, image, conversationId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Chats with the support contact are the assistant's, kept apart in each user's Chat history.
    // The user's messages go into the chat they have open; support's replies go into the user's latest chat.
    const support = await getSupportContact();
    const isToAssistant = Boolean(support?._id.equals(receiverId)) && !support._id.equals(senderId);
    let conversation = null;
    if (isToAssistant && conversationId) {
      conversation = await findConversation(senderId, conversationId);
      if (!conversation) return res.status(404).json({ message: "Chat not found" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    if (isToAssistant) conversation ??= await startConversation(senderId, text);
    else if (support?._id.equals(senderId)) conversation = await getLatestConversation(receiverId, text);

    // Save user message
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      conversationId: conversation?._id,
    });
    await newMessage.save();
    if (conversation) await touchConversation(conversation._id, newMessage.createdAt);

    // ── Bot: analyze image and find similar products (the assistant's chat only) ──
    if (imageUrl && isToAssistant) {
      console.log("Image received! Analyzing...");
      replyToPhoto(senderId, conversation._id, imageUrl);
    }

    // Send to receiver via socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // Send back to sender
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", newMessage);
    }

    // ── Notify ecommerce admin ─────────────────────────────────────────
    const sender = await User.findById(senderId).select("fullName role");
    if (sender && sender.role !== "admin") {
      await notifyEcommerceAdmin(sender.fullName, text || "📷 Sent an image");
    }

    res.status(201).json(newMessage);

  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};