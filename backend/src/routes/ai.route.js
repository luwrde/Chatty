import express, { Router } from "express";
import cors from "cors";
import { getBotReply, askGroqVision } from "../lib/socket.js";

const router = Router();

// The store's chat widget (ecommerce/includes/ai-chatbot.php) calls this from the PHP site without cookies
const widgetCors = cors({
  origin: ["http://localhost", "http://127.0.0.1"],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

// Tiny in-memory rate limit to protect the Groq quota: 10 requests per minute per IP
const RATE_LIMIT = 10;
const IMAGE_RATE_LIMIT = 3; // photo requests use the vision model: stricter
const WINDOW_MS  = 60 * 1000;
const hits = new Map(); // ip -> { start, count }
const imageHits = new Map();

setInterval(() => {
  const now = Date.now();
  for (const map of [hits, imageHits]) for (const [ip, h] of map) if (now - h.start > WINDOW_MS) map.delete(ip);
}, WINDOW_MS).unref();

function isRateLimited(ip, map = hits, limit = RATE_LIMIT) {
  const now = Date.now();
  const h = map.get(ip);
  if (!h || now - h.start > WINDOW_MS) {
    map.set(ip, { start: now, count: 1 });
    return false;
  }
  h.count++;
  return h.count > limit;
}

// A photo must be a JPEG/PNG/WebP data URL of at most 2 MB whose bytes really are that format
const IMAGE_PREFIX = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function isValidImage(dataUrl) {
  const match = typeof dataUrl === "string" && dataUrl.match(IMAGE_PREFIX);
  if (!match) return false;
  const base64 = dataUrl.slice(match[0].length);
  if (base64.length * 3 / 4 > MAX_IMAGE_BYTES + 3 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return false;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_IMAGE_BYTES) return false;
  if (match[1] === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (match[1] === "png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}

// The widget inserts `reply` as HTML, so escape it (its linkify still turns plain URLs into links)
const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

router.options("/chat", widgetCors);

// POST /api/ai/chat  { message, sessionId, image? }  ->  { reply }
router.post("/chat", widgetCors, express.json({ limit: "3mb" }), async (req, res) => {
  const ip = req.ip || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ reply: "⏳ Masyadong maraming mensahe. Maghintay ng isang minuto bago magtanong ulit." });
  }

  const image = req.body?.image;
  const hasImage = image !== undefined && image !== null && image !== "";
  if (hasImage && isRateLimited(ip, imageHits, IMAGE_RATE_LIMIT)) {
    return res.status(429).json({ reply: "⏳ Hanggang 3 larawan lang kada minuto. Maghintay sandali bago magpadala ulit." });
  }
  if (hasImage && !isValidImage(image)) {
    return res.status(400).json({ error: "invalid image", reply: "Hindi mabasa ang larawan. JPG, PNG o WebP lang, hanggang 2 MB." });
  }

  let message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message && hasImage) message = "What is in this photo?";
  if (!message || message.length > 500) {
    return res.status(400).json({ error: "message must be 1-500 characters", reply: "Pakisulat ang mensahe mo (hanggang 500 characters lang)." });
  }

  const sessionId = String(req.body.sessionId ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  const userId = `widget-${sessionId || ip.replace(/[^A-Za-z0-9]/g, "_")}`;

  try {
    const reply = hasImage ? await askGroqVision(userId, message, image) : await getBotReply(userId, message);
    res.status(200).json({ reply: escapeHtml(reply) });
  } catch (error) {
    console.log("Error in ai chat route:", error.message);
    res.status(500).json({ reply: "Pasensya, may technical issue kami ngayon. Subukan ulit mamaya. 😊" });
  }
});

// Malformed JSON or an oversized body: short JSON error (with a reply the widget can show), never a stack trace
router.use((err, req, res, next) => {
  res.status(err.status === 413 ? 413 : 400).json({ error: "invalid request body", reply: "Hindi ma-proseso ang ipinadala. Subukan ang mas maliit na larawan o i-type ang tanong." });
});

export default router;
