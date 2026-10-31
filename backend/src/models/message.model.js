import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.Mixed,  // ← Mixed para pwedeng ObjectId o "bot"
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    isBot: {
      type: Boolean,
      default: false,  // ← NEW
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation", // chats with the support contact only: the assistant chat the message is in
    },
    card: {
      type: mongoose.Schema.Types.Mixed, // bot replies: the card under the text ({ type: "policies" | "order", ... })
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;