import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import mysql from "mysql2/promise";

// ── MySQL connection to ecommerce DB ──────────────────────────────────────
const ecommerceDB = mysql.createPool({
  host:     "localhost",
  user:     "root",
  password: "",
  database: "ecommerse_db",
});

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

// ── Send bot message helper ────────────────────────────────────────────────
async function sendBotMessage(receiverId, text) {
  try {
    const adminUser   = await User.findOne({ role: "admin" });
    const botSenderId = adminUser ? adminUser._id : receiverId;

    const botMessage = new Message({
      senderId:   botSenderId,
      receiverId: receiverId,
      text:       text,
      isBot:      true,
    });
    await botMessage.save();

    const socketId = getReceiverSocketId(receiverId.toString());
    if (socketId) {
      io.to(socketId).emit("newMessage", botMessage);
    } else {
      io.emit("newMessage", botMessage);
    }
  } catch (err) {
    console.error("sendBotMessage error:", err.message);
  }
}

// ── CONTROLLERS ────────────────────────────────────────────────────────────

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
        { receiverId: myId, isBot: true },
      ],
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;

      // ── Bot: analyze image and find similar products ──────────────────
      console.log("Image received! Analyzing...");
      setTimeout(async () => {
        try {
          const senderSocketId = getReceiverSocketId(senderId.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit("botTyping", true);
          }

          const { tags, products, isExact } = await analyzeImageAndFindProducts(imageUrl);
          const botReply = formatImageSearchResults(tags, products, isExact);

          if (senderSocketId) {
            io.to(senderSocketId).emit("botTyping", false);
          }

          await sendBotMessage(senderId, botReply);
        } catch (err) {
          console.error("Image bot error:", err.message);
        }
      }, 1500);
      // ─────────────────────────────────────────────────────────────────
    }

    // Save user message
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });
    await newMessage.save();

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