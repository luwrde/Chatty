export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Same rule as the store's own pages: the feed has a file name, the file lives in uploads/ next to user-home.php
export function getProductImageUrl(product) {
  if (!product?.image) return null;
  try {
    return /^https?:\/\//i.test(product.image) ? product.image : new URL(`uploads/${product.image}`, product.link).href;
  } catch {
    return null;
  }
}

// Feed prices are strings like "1,250.00"
export const parsePrice = (price) => Number(String(price ?? "").replace(/,/g, "")) || 0;

const pesoFormat = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
export const formatPeso = (amount) => pesoFormat.format(Number(amount) || 0);

// "Oct 27, 2026". Date-only values ("2026-10-30") are read as local dates, not UTC midnight.
export function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString("en-US", options);
}

// Chat history dates: the time today ("13:28"), "Yesterday", then the day ("Oct 29"; with the year if not this year)
export function formatChatDate(value, now = new Date()) {
  const date = new Date(value);
  const startOfDay = (day) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (daysAgo <= 0) return formatMessageTime(date);
  if (daysAgo === 1) return "Yesterday";
  return formatDate(value, date.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : undefined);
}

// How long ago, short: "just now", "4 min", "2 h", "3 days"
export function formatTimeSince(value, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
