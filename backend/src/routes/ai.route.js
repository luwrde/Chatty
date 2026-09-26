import express, { Router } from "express";
import cors from "cors";
import { getBotReply } from "../lib/socket.js";

const router = Router();

// The store's chat widget (ecommerce/includes/ai-chatbot.php) calls this from the PHP site without cookies
const widgetCors = cors({
  origin: ["http://localhost", "http://127.0.0.1"],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

// Tiny in-memory rate limit to protect the Groq quota: 10 requests per minute per IP
const RATE_LIMIT = 10;
const WINDOW_MS  = 60 * 1000;
const hits = new Map(); // ip -> { start, count }

setInterval(() => {
  const now = Date.now();
  for (const [ip, h] of hits) if (now - h.start > WINDOW_MS) hits.delete(ip);
}, WINDOW_MS).unref();

function isRateLimited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  h.count++;
  return h.count > RATE_LIMIT;
}

// The widget inserts `reply` as HTML, so escape it (its linkify still turns plain URLs into links)
const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

router.options("/chat", widgetCors);

// POST /api/ai/chat  { message, sessionId }  ->  { reply }
router.post("/chat", widgetCors, express.json({ limit: "10kb" }), async (req, res) => {
  const ip = req.ip || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ reply: "⏳ Masyadong maraming mensahe. Maghintay ng isang minuto bago magtanong ulit." });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 500) {
    return res.status(400).json({ error: "message must be 1-500 characters", reply: "Pakisulat ang mensahe mo (hanggang 500 characters lang)." });
  }

  const sessionId = String(req.body.sessionId ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  const userId = `widget-${sessionId || ip.replace(/[^A-Za-z0-9]/g, "_")}`;

  try {
    const reply = await getBotReply(userId, message);
    res.status(200).json({ reply: escapeHtml(reply) });
  } catch (error) {
    console.log("Error in ai chat route:", error.message);
    res.status(500).json({ reply: "Pasensya, may technical issue kami ngayon. Subukan ulit mamaya. 😊" });
  }
});

// Malformed JSON or an oversized body: short JSON error, never a stack trace
router.use((err, req, res, next) => {
  res.status(err.status === 413 ? 413 : 400).json({ error: "invalid request body" });
});

export default router;
