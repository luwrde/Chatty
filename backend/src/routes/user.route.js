import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";

const router = express.Router();

// DELETE /api/user/delete
router.delete("/delete", protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;

        // Delete user
        await User.findByIdAndDelete(userId);

        // Clear JWT cookie
        res.clearCookie("jwt", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        return res.status(200).json({
            success: true,
            message: "Account deleted successfully",
        });

    } catch (err) {
        console.error("Delete account error:", err.message);
        return res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
