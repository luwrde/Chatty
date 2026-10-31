import { Router } from "express";
import mongoose from "mongoose";
import { protectRoute, adminOnly } from "../middleware/auth.middleware.js";
import StoreFact, { FACT_CATEGORIES } from "../models/storeFact.model.js";
import { getAllFacts, invalidateFactsCache } from "../lib/storeFacts.js";

const router = Router();

const INVALID_FACT = "Each fact needs a topic (up to 80 characters) and an answer (up to 600 characters).";

// Only the editable fields; missing ones are left out, so PATCH changes just what was sent
const pickFactFields = (body) => {
  const fields = {};
  for (const key of ["topic", "answer", "category", "status"]) {
    if (typeof body?.[key] === "string") fields[key] = body[key].trim();
  }
  return fields;
};

// GET /api/knowledge -> { facts, pendingCategories }
// The Help Center: confirmed facts, and the categories that so far only have unconfirmed ones
router.get("/", protectRoute, async (req, res) => {
  try {
    const all = await getAllFacts();
    const facts = all
      .filter((fact) => fact.status === "confirmed")
      .map(({ _id, topic, answer, category }) => ({ _id, topic, answer, category }));
    const pendingCategories = FACT_CATEGORIES.filter(
      (category) => !facts.some((fact) => fact.category === category) && all.some((fact) => fact.category === category)
    );
    res.status(200).json({ facts, pendingCategories });
  } catch (error) {
    console.log("Error in knowledge route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/knowledge/all -> every fact, confirmed or not (admin console)
router.get("/all", protectRoute, adminOnly, async (req, res) => {
  try {
    res.status(200).json(await getAllFacts());
  } catch (error) {
    console.log("Error in knowledge route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/knowledge { topic, answer, category, status } -> the new fact
router.post("/", protectRoute, adminOnly, async (req, res) => {
  try {
    const fact = await StoreFact.create(pickFactFields(req.body));
    invalidateFactsCache();
    res.status(201).json(fact);
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: INVALID_FACT });
    console.log("Error in knowledge route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /api/knowledge/:id { topic?, answer?, category?, status? } -> the updated fact
router.patch("/:id", protectRoute, adminOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Fact not found" });
  try {
    const fact = await StoreFact.findByIdAndUpdate(req.params.id, pickFactFields(req.body), { new: true, runValidators: true });
    if (!fact) return res.status(404).json({ message: "Fact not found" });
    invalidateFactsCache();
    res.status(200).json(fact);
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: INVALID_FACT });
    console.log("Error in knowledge route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/knowledge/:id
router.delete("/:id", protectRoute, adminOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Fact not found" });
  try {
    const fact = await StoreFact.findByIdAndDelete(req.params.id);
    if (!fact) return res.status(404).json({ message: "Fact not found" });
    invalidateFactsCache();
    res.status(200).json({ message: "Fact deleted" });
  } catch (error) {
    console.log("Error in knowledge route:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
