import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";
import { getOrdersForEmail } from "../lib/storeOrders.js";

const router = Router();

// GET /api/orders -> { linked, orders }
// The signed-in buyer's store orders, found by their account email (linked: false when the store has no such account).
// Seller emails stay on the server: each seller becomes a chat id, if they have a chat account, for "Message seller".
router.get("/", protectRoute, async (req, res) => {
  let result;
  try {
    result = await getOrdersForEmail(req.user.email);
  } catch (error) {
    console.log("Error in orders route:", error.message);
    return res.status(503).json({ message: "The store's orders can't be reached right now" });
  }

  try {
    const emails = [...new Set(result.orders.flatMap((order) => order.sellers.map((seller) => seller.email)).filter(Boolean))];
    const chatSellers = emails.length > 0
      ? await User.find({ email: { $in: emails } }).collation({ locale: "en", strength: 2 }).select("_id email")
      : [];
    const chatIdByEmail = new Map(chatSellers.map((user) => [user.email.toLowerCase(), String(user._id)]));

    const orders = result.orders.map((order) => ({
      ...order,
      sellers: order.sellers.map(({ name, email }) => ({ name, chatUserId: chatIdByEmail.get(email) ?? null })),
    }));
    res.status(200).json({ linked: result.linked, orders });
  } catch (error) {
    console.log("Error in orders route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
