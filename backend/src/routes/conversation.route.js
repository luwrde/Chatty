import { Router } from "express";
import mongoose from "mongoose";
import { protectRoute } from "../middleware/auth.middleware.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { groupEarlierMessages } from "../lib/conversations.js";

// The signed-in user's chats with the assistant: their Chat history. A chat starts with its first message
// (POST /api/messages/send/:supportId without a conversationId).
const router = Router();
router.use(protectRoute);

const LIST_FIELDS = "title lastMessageAt pinned archived";
const MAX_TITLE = 80;

// GET /api/conversations -> [{ _id, title, lastMessageAt, pinned, archived }], the most recent first
router.get("/", async (req, res) => {
  try {
    await groupEarlierMessages(req.user._id);
    const conversations = await Conversation.find({ userId: req.user._id, deletedAt: null })
      .sort({ lastMessageAt: -1 })
      .select(LIST_FIELDS)
      .lean();
    res.status(200).json(conversations);
  } catch (error) {
    console.log("Error in conversations route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/conversations/:id/messages -> the chat's messages, oldest first (only the user's own chats)
router.get("/:id/messages", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Chat not found" });
  try {
    if (!(await Conversation.exists({ _id: req.params.id, userId: req.user._id, deletedAt: null }))) {
      return res.status(404).json({ message: "Chat not found" });
    }
    const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in conversations route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /api/conversations/:id { title?, pinned?, archived? } -> the chat as listed. Archiving also unpins it.
router.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Chat not found" });
  const { title, pinned, archived } = req.body ?? {};
  const changes = {};
  if (title !== undefined) {
    const name = typeof title === "string" ? title.replace(/\s+/g, " ").trim() : "";
    if (!name) return res.status(400).json({ message: "Give the chat a name" });
    changes.title = name.slice(0, MAX_TITLE);
  }
  for (const [field, value] of Object.entries({ pinned, archived })) {
    if (value === undefined) continue;
    if (typeof value !== "boolean") return res.status(400).json({ message: `${field} must be true or false` });
    changes[field] = value;
  }
  if (changes.archived) changes.pinned = false;
  if (Object.keys(changes).length === 0) return res.status(400).json({ message: "Nothing to change" });

  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, deletedAt: null },
      { $set: changes },
      { new: true }
    )
      .select(LIST_FIELDS)
      .lean();
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    res.status(200).json(conversation);
  } catch (error) {
    console.log("Error in conversations route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/conversations/:id -> gone from the user's Chat history for good.
// The messages stay: they're also support's side of the chat (the chat tells buyers support can read them).
router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Chat not found" });
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, deletedAt: null },
      { $set: { deletedAt: new Date(), pinned: false } }
    );
    if (!conversation) return res.status(404).json({ message: "Chat not found" });
    res.status(200).json({ _id: conversation._id });
  } catch (error) {
    console.log("Error in conversations route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
