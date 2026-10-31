import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getEcommerceData } from "../lib/socket.js";
import { getFreeShippingProductIds } from "../lib/store.js";

const router = Router();

const MAX_IDS = 20;
const SHOWCASE_SIZE = 6; // the sign-in page shows 3; the rest stand in for photos that don't load
const SHOWCASE_CACHE_MS = 60 * 1000;
let showcaseCache = null; // { products, expiresAt }

// In-stock products with a photo. The showcase route is public, so the store is read at most once a minute.
const getShowcaseCandidates = async () => {
  if (showcaseCache && Date.now() < showcaseCache.expiresAt) return showcaseCache.products;
  const feed = await getEcommerceData();
  const products = (feed.products ?? [])
    .filter((product) => product.image && product.status !== "Out of Stock")
    .map(({ id, name, price, image, link, category }) => ({ id, name, price, image, link, category }));
  // A failed read isn't kept, so the products show up as soon as the store is back
  if (feed.available !== false) showcaseCache = { products, expiresAt: Date.now() + SHOWCASE_CACHE_MS };
  return products;
};

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// GET /api/products/catalog -> { available, products, categories, sellers }
// The Store page: the same feed the bot uses, plus the Free Shipping badge from the store database.
// available is false when the store can't be reached (the lists are then empty).
router.get("/catalog", protectRoute, async (req, res) => {
  try {
    const [feed, freeShippingIds] = await Promise.all([getEcommerceData(), getFreeShippingProductIds()]);
    const { products = [], categories = [], sellers = [] } = feed;
    res.status(200).json({
      available: feed.available !== false,
      products: products.map(({ id, name, price, stock, status, image, link, category, store, rating, reviews }) => ({
        id, name, price, stock, status, image, link, category, store, rating, reviews,
        freeShipping: freeShippingIds.has(String(id)),
      })),
      categories: categories.map(({ name, count }) => ({ name, count })),
      sellers: sellers.map(({ store, product_count, avg_rating }) => ({ store, productCount: product_count, rating: avg_rating })),
    });
  } catch (error) {
    console.log("Error in products catalog route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/products/showcase -> [{ id, name, price, image, link }]
// Public: real products for the sign-in and sign-up pages, a different mix on each visit.
// One per category first, so the cards on show aren't all the same kind of product.
router.get("/showcase", async (req, res) => {
  try {
    const categoriesSeen = new Set();
    const varied = [];
    const repeats = [];
    for (const product of shuffle(await getShowcaseCandidates())) {
      (categoriesSeen.has(product.category) ? repeats : varied).push(product);
      categoriesSeen.add(product.category);
    }
    res.status(200).json([...varied, ...repeats].slice(0, SHOWCASE_SIZE).map(({ category, ...product }) => product));
  } catch (error) {
    console.log("Error in products showcase route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

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
