import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getEcommerceData } from "../lib/socket.js";

const router = Router();

const MAX_IDS = 20;

// GET /api/products?ids=12,34  ->  [{ id, name, price, stock, status, image, link }]
// Read-only: details for the product cards in the chat, from the same store feed the bot uses
router.get("/", protectRoute, async (req, res) => {
  const ids = String(req.query.ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))
    .slice(0, MAX_IDS);
  if (ids.length === 0) return res.status(200).json([]);

  try {
    const { products = [] } = await getEcommerceData();
    const wanted = new Set(ids);
    const found = products
      .filter((p) => wanted.has(String(p.id)))
      .map(({ id, name, price, stock, status, image, link }) => ({ id, name, price, stock, status, image, link }));
    res.status(200).json(found);
  } catch (error) {
    console.log("Error in products route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
