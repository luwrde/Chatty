import mongoose from "mongoose";

export const FACT_CATEGORIES = ["shipping", "payments", "ordering", "status", "cancellations", "returns", "other"];

// A store policy fact. Only confirmed facts reach the bot and the Help Center; admins confirm the rest.
const storeFactSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    category: {
      type: String,
      enum: FACT_CATEGORIES,
      default: "other",
    },
    status: {
      type: String,
      enum: ["confirmed", "unconfirmed"],
      default: "unconfirmed",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const StoreFact = mongoose.model("StoreFact", storeFactSchema);

export default StoreFact;
