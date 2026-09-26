import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

const router = Router();

router.post("/token", async (req, res) => {
  try {
    const { uid, name, email, role } = req.body;
    if (!uid || !email) return res.status(400).json({ error: "uid and email are required" });

    const fullName  = String(name  || "User").slice(0, 100);
    const userEmail = String(email).toLowerCase().trim().slice(0, 200);
    const userRole  = role === "seller" ? "admin" : "user";

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      const salt     = await bcrypt.genSalt(10);
      const password = await bcrypt.hash(`ecommerce-uid-${uid}-${Date.now()}`, salt);
      user = await User.create({ email: userEmail, fullName, password, role: userRole, profilePic: "" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure:   isProd,
    });

    return res.status(200).json({ _id: user._id, fullName: user.fullName, email: user.email, profilePic: user.profilePic, role: user.role });
  } catch (err) {
    console.error("Error in embed/token:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;