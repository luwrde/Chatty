import { Headphones, MessageCircle, Package, ShoppingBag } from "lucide-react";

export const BOT_DISPLAY_NAME = "EcommerSense AI";

// What the bot helps with (welcome screen and assistant panel)
export const BOT_FEATURES = [
  { icon: ShoppingBag, title: "Shop smarter", text: "Product picks, prices and stock" },
  { icon: Package, title: "Track your orders", text: "Order status and tracking help" },
  { icon: Headphones, title: "Get support", text: "Type “admin” to reach a person" },
  { icon: MessageCircle, title: "Just ask!", text: "Not only shopping, ask me anything" },
];

// Sent by "Talk to support". It must keep matching the server's support-request check
// (backend/src/lib/socket.js, sendMessage handler: at most 4 words and one of
// "admin", "talk to human", "live agent", "kausapin", "live support")
export const SUPPORT_REQUEST_TEXT = "I need live support";

export const THEMES = [
  "lavender",
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
];