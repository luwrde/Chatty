import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { protectRoute, adminOnly } from "../middleware/auth.middleware.js";
import SupportRequest from "../models/supportRequest.model.js";
import UnansweredQuestion from "../models/unansweredQuestion.model.js";
import User from "../models/user.model.js";
import { storeDb } from "../lib/store.js";
import { getEcommerceData, notifySupportRequestsChanged, notifySupportResolved } from "../lib/socket.js";

// The admin console's data. Every route here is for admins only.
const router = Router();
router.use(protectRoute, adminOnly);

// GET /api/admin/overview -> the store connections, for the "Store data" card
router.get("/overview", async (req, res) => {
  try {
    const [feed, storeDbConnected] = await Promise.all([
      getEcommerceData(),
      storeDb.query("SELECT 1").then(() => true, () => false),
    ]);
    res.status(200).json({
      feed: {
        available: feed.available !== false,
        products: feed.products?.length ?? 0,
        categories: feed.categories?.length ?? 0,
        sellers: feed.sellers?.length ?? 0,
      },
      storeDb: { connected: storeDbConnected },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.log("Error in admin route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/admin/support-requests -> pending requests, oldest first, with the buyer's name and photo
router.get("/support-requests", async (req, res) => {
  try {
    const requests = await SupportRequest.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .populate("userId", "fullName profilePic")
      .lean();
    res.status(200).json(requests.map(({ userId: user, ...request }) => ({ ...request, user })));
  } catch (error) {
    console.log("Error in admin route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /api/admin/support-requests/:id -> marks it resolved and tells the buyer in their bot chat
router.patch("/support-requests/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Request not found" });
  try {
    const request = await SupportRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "resolved", resolvedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: "Request not found or already resolved" });
    notifySupportResolved(String(request.userId));
    notifySupportRequestsChanged();
    res.status(200).json(request);
  } catch (error) {
    console.log("Error in admin route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/admin/unanswered -> open questions the bot couldn't answer, most recent first
router.get("/unanswered", async (req, res) => {
  try {
    const questions = await UnansweredQuestion.find({ status: "open" }).sort({ lastAskedAt: -1 }).limit(30).lean();
    res.status(200).json(questions.map(({ _id, question, count, lastAskedAt }) => ({ _id, question, count, lastAskedAt })));
  } catch (error) {
    console.log("Error in admin route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /api/admin/unanswered/:id { status: "answered" | "dismissed" } -> takes it off the list
router.patch("/unanswered/:id", async (req, res) => {
  const { status } = req.body ?? {};
  if (!["answered", "dismissed"].includes(status)) return res.status(400).json({ message: "Status must be answered or dismissed" });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Question not found" });
  try {
    const question = await UnansweredQuestion.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.status(200).json({ _id: question._id, status: question.status });
  } catch (error) {
    console.log("Error in admin route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/admin/admins -> every admin account, oldest first, for the "Admin accounts" card
router.get("/admins", async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).sort({ createdAt: 1 }).select("fullName email profilePic createdAt").lean();
    res.status(200).json(admins);
  } catch (error) {
    console.log("Error in admin route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/admin/admins { fullName, email, password } -> a new admin, who signs in on the regular sign-in page.
// Sign-up only makes buyer accounts, so this is how admins are added. The jwt cookie stays the current admin's.
router.post("/admins", async (req, res) => {
  const { fullName, email, password } = req.body ?? {};
  const isFilled = (value) => typeof value === "string" && value.trim() !== "";
  if (![fullName, email, password].every(isFilled)) return res.status(400).json({ message: "All fields are required" });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
  try {
    if (await User.exists({ email: email.trim() })) return res.status(400).json({ message: "Email already exists" });
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const admin = await User.create({ fullName: fullName.trim(), email: email.trim(), password: hashedPassword, role: "admin" });
    res.status(201).json({ _id: admin._id, fullName: admin.fullName, email: admin.email, profilePic: admin.profilePic, createdAt: admin.createdAt });
  } catch (error) {
    console.log("Error in admin route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
