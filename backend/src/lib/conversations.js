import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

// The support contact (the bot chat): the first admin account. Sellers who join from the store are admins too.
export const getSupportContact = () => User.findOne({ role: "admin" }).sort({ createdAt: 1 }).select("_id");

// Everything in a user's chat with the support contact (their messages, the bot's replies, support's replies)
// belongs to one of their assistant chats, so their Chat history can keep the chats apart.

// A chat's name in Chat history: its first message, on one line and shortened
export function toChatTitle(text) {
  const line = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!line) return "Photo";
  return line.length > 60 ? `${line.slice(0, 59).trimEnd()}…` : line;
}

// The user's own chat with that id, or null (also for a chat they deleted)
export async function findConversation(userId, conversationId) {
  if (!mongoose.isValidObjectId(conversationId)) return null;
  return Conversation.findOne({ _id: conversationId, userId, deletedAt: null });
}

// A new chat, named after its first message
export const startConversation = (userId, firstText) => Conversation.create({ userId, title: toChatTitle(firstText) });

// Where support's replies and the bot's notes about a support request go: the user's latest chat (or a new one)
export async function getLatestConversation(userId, firstText) {
  await groupEarlierMessages(userId);
  return (
    (await Conversation.findOne({ userId, deletedAt: null }).sort({ lastMessageAt: -1 })) ??
    startConversation(userId, firstText)
  );
}

// A new message moves its chat to the top of Chat history, and out of Archived so it isn't missed
export const touchConversation = (conversationId, at) =>
  Conversation.updateOne({ _id: conversationId }, { $max: { lastMessageAt: at }, $set: { archived: false } });

// ── Messages from before chats were kept apart ─────────────────────────────
// They have no conversationId. They're grouped into chats once per user: a new chat wherever nobody wrote for
// an hour. The bot's text replies weren't saved back then, so these chats have the user's messages, support's
// replies and the bot's photo replies only.
const SESSION_GAP_MS = 60 * 60 * 1000;
const groupings = new Map(); // userId -> its grouping (done or running), so two requests can't group twice

export function groupEarlierMessages(userId) {
  const key = String(userId);
  if (!groupings.has(key)) {
    groupings.set(key, groupNow(new mongoose.Types.ObjectId(key)).catch((error) => {
      groupings.delete(key); // tried again on the next request
      throw error;
    }));
  }
  return groupings.get(key);
}

async function groupNow(userId) {
  const support = await getSupportContact();
  if (!support || support._id.equals(userId)) return;

  // What the support contact's chat showed then: the two of them, plus every bot reply to the user
  // (senderId can hold "bot", so it isn't cast: the ids here are ObjectIds)
  const earlier = await Message.find({
    conversationId: { $exists: false },
    $or: [
      { senderId: userId, receiverId: support._id },
      { senderId: support._id, receiverId: userId },
      { receiverId: userId, isBot: true },
    ],
  })
    .sort({ createdAt: 1 })
    .select("senderId text createdAt")
    .lean();

  const sessions = [];
  for (const message of earlier) {
    const session = sessions.at(-1);
    if (session && message.createdAt - session.at(-1).createdAt <= SESSION_GAP_MS) session.push(message);
    else sessions.push([message]);
  }

  for (const session of sessions) {
    const firstQuestion = session.find((message) => userId.equals(message.senderId) && message.text) ?? session[0];
    const conversation = await Conversation.create({
      userId,
      title: toChatTitle(firstQuestion.text),
      lastMessageAt: session.at(-1).createdAt,
    });
    await Message.updateMany(
      { _id: { $in: session.map((message) => message._id) } },
      { $set: { conversationId: conversation._id } }
    );
  }
  if (sessions.length > 0) console.log(`Grouped ${earlier.length} earlier messages into ${sessions.length} chat(s) for user ${userId}`);
}
