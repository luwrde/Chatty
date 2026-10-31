import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";
import authRoutes    from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import conversationRoutes from "./routes/conversation.route.js";
import userRoutes    from "./routes/user.route.js";
import embedRoutes   from "./routes/embed.route.js"; // ← NEW
import aiRoutes      from "./routes/ai.route.js";
import productRoutes from "./routes/product.route.js";
import orderRoutes   from "./routes/order.route.js";
import knowledgeRoutes from "./routes/knowledge.route.js";
import adminRoutes   from "./routes/admin.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();
const PORT      = process.env.PORT;
const __dirname = path.resolve();

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost",
  "http://localhost:8080",
];

// Store chat widget: registered before the global CORS/JSON middleware because it has
// its own CORS (no cookies), body size limit and rate limit
app.use("/api/ai",       aiRoutes);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.use("/api/auth",     authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes); // the assistant's chats: Chat history
app.use("/api/user",     userRoutes);
app.use("/api/embed",    embedRoutes); // ← NEW
app.use("/api/products", productRoutes); // read-only product details: the chat's product cards and the Store page
app.use("/api/orders",   orderRoutes);   // the buyer's store orders (Orders page)
app.use("/api/knowledge", knowledgeRoutes); // store policies: Help Center, the bot, admin console
app.use("/api/admin",    adminRoutes);   // admin console

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html")));
}

try {
  await connectDB();
  server.listen(PORT, () => console.log("server is running on PORT: " + PORT));
} catch (error) {
  // Connection strings can contain credentials; do not print them in errors.
  console.error(`Database startup failed (${error.code || error.name}). Check MONGODB_URI and database connectivity. See README.md.`);
  process.exit(1);
}
