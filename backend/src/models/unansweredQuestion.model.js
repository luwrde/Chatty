import mongoose from "mongoose";

// A question the bot couldn't answer from confirmed store data (its reply sent the buyer to support).
// Who asked is not stored; repeats of the same question only raise the count.
const unansweredQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      maxlength: 500,
    },
    key: {
      type: String,
      required: true, // the question normalized, to count repeats
    },
    count: {
      type: Number,
      default: 1,
    },
    lastAskedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["open", "answered", "dismissed"],
      default: "open",
    },
  },
  { timestamps: true }
);

unansweredQuestionSchema.index({ key: 1, status: 1 });

const UnansweredQuestion = mongoose.model("UnansweredQuestion", unansweredQuestionSchema);

export default UnansweredQuestion;
