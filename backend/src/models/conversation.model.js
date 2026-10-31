import mongoose from "mongoose";

// One of a user's chats with the assistant (the support contact's chat), listed in their Chat history.
// Its messages point to it (message.conversationId).
const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "", // the chat's first message, shortened
    },
    lastMessageAt: {
      type: Date,
      default: Date.now, // orders Chat history
    },
    pinned: {
      type: Boolean,
      default: false, // listed first in Chat history
    },
    archived: {
      type: Boolean,
      default: false, // under Archived instead, until unarchived or a new message arrives in it
    },
    deletedAt: {
      type: Date,
      default: null, // deleted by the user: gone from their Chat history. Support keeps its copy of the messages.
    },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
