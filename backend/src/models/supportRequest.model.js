import mongoose from "mongoose";

// A buyer asking for a person from the bot chat ("Talk to a person" or typing "admin")
const supportRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    lastQuestion: {
      type: String,
      default: "", // what the buyer asked before, so support has context
    },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const SupportRequest = mongoose.model("SupportRequest", supportRequestSchema);

export default SupportRequest;
