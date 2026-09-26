import express from "express";
import { login, logout, signup, updateProfile, checkAuth, deleteAccount } from "../controllers/auth.controller.js";
import { protectRoute, optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.delete("/delete-account", protectRoute, deleteAccount); // ADD THIS LINE

router.put("/update-profile", protectRoute, updateProfile);

// Responds 200 with null when logged out, so the browser doesn't log a 401 on every page load
router.get("/check", optionalAuth, checkAuth);

export default router;