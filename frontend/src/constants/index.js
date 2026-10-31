import {
  BookOpen, Bot, CircleHelp, FileText, Gift, LayoutDashboard, MessagesSquare, Package, RotateCcw, ShieldCheck,
  ShoppingBag, Star, Store, Truck, Wallet,
} from "lucide-react";

export const BOT_DISPLAY_NAME = "EcommerSense AI";

// Navbar tabs; buyers also get them as the bottom tab bar on phones
export const BUYER_TABS = [
  { to: "/", label: "Assistant", icon: Bot, end: true },
  { to: "/store", label: "Store", icon: Store },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/help", label: "Help Center", shortLabel: "Help", icon: BookOpen },
];

export const ADMIN_TABS = [
  { to: "/", label: "Chats", icon: MessagesSquare, end: true },
  { to: "/admin", label: "Console", icon: LayoutDashboard },
];

// The bot chat's first-visit suggestions; each sends its text as a message
export const STARTER_PROMPTS = [
  { icon: Star, text: "Best sellers" },
  { icon: Package, text: "Track my order" },
  { icon: Truck, text: "Shipping fee" },
  { icon: Wallet, text: "Payment options" },
];

// The suggestion row under the conversation, picked by the card in the bot's last reply.
// One with "to" opens that page instead of sending a message.
export const FOLLOW_UP_PROMPTS = {
  order: [
    { icon: Package, text: "Show my other orders", to: "/orders" },
    { icon: Star, text: "Best sellers" },
    { icon: Gift, text: "Recommend a gift" },
  ],
  policies: [
    { icon: Package, text: "Track my order" },
    { icon: Star, text: "Best sellers" },
    { icon: Gift, text: "Recommend a gift" },
  ],
  default: [
    { icon: Package, text: "Track my order" },
    { icon: Star, text: "Best sellers" },
    { icon: FileText, text: "Store policies" },
  ],
};

// Store policy categories, in the backend's order (backend/src/lib/storeFacts.js)
export const FACT_CATEGORIES = [
  { key: "shipping", title: "Shipping and delivery", icon: Truck },
  { key: "payments", title: "Payments and promo codes", icon: Wallet },
  { key: "ordering", title: "Ordering", icon: ShoppingBag },
  { key: "status", title: "Order status", icon: Package },
  { key: "cancellations", title: "Cancellations and refunds", icon: RotateCcw },
  { key: "returns", title: "Returns and warranty", icon: ShieldCheck },
  { key: "other", title: "More about EcommerSense", icon: CircleHelp },
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