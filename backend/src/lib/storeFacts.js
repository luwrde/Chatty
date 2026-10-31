import StoreFact, { FACT_CATEGORIES } from "../models/storeFact.model.js";

// Section titles, in the order the Help Center and the bot prompt list them
export const CATEGORY_TITLES = {
  shipping: "Shipping and delivery",
  payments: "Payments and promo codes",
  ordering: "Ordering",
  status: "Order status",
  cancellations: "Cancellations and refunds",
  returns: "Returns and warranty",
  other: "More about EcommerSense",
};

// First run only (empty collection): the facts the bot's prompt stated as confirmed, and the ones
// that were taken out of it because the store code didn't support them (unconfirmed, for the team to check)
const DEFAULT_FACTS = [
  { category: "shipping", status: "confirmed", topic: "Shipping fee", answer: "A flat ₱40 shipping fee per seller in each order, with no minimum. Shipping is free only on products with a Free Shipping badge, or with a freeship promo code." },
  { category: "shipping", status: "confirmed", topic: "Delivery", answer: "Orders are delivered by EcommerSense's own riders and hubs." },
  { category: "payments", status: "confirmed", topic: "Payment methods", answer: "Cash on Delivery (COD), GCash, or E-Wallet (the buyer's EcommerSense wallet balance). Credit and debit cards are not accepted." },
  { category: "payments", status: "confirmed", topic: "Promo codes", answer: "Promo codes give either a percent discount or free shipping." },
  { category: "ordering", status: "confirmed", topic: "How to order", answer: "Browse products, tap + Add, open the cart, check out, then confirm the payment." },
  { category: "status", status: "confirmed", topic: "Order status", answer: "Orders move through Placed Orders, Order Packed, To Ship, In Transit, Arrived at Hub, To Receive and Completed. An order can also be Cancelled." },
  { category: "cancellations", status: "confirmed", topic: "Refunds on cancellation", answer: "A cancelled order paid with GCash or E-Wallet is refunded in full to the buyer's E-Wallet right away. Cash on Delivery orders need no refund." },
  { category: "other", status: "confirmed", topic: "Sellers", answer: "Only verified sellers can list products." },
  { category: "cancellations", status: "unconfirmed", topic: "Cancellation window", answer: "Orders can be cancelled before they ship (Orders, find the order, then Cancel)." },
  { category: "returns", status: "unconfirmed", topic: "Return window", answer: "Returns are accepted within 7 days of receiving the item, with the original receipt and photo proof." },
  { category: "returns", status: "unconfirmed", topic: "Refund time", answer: "Approved refunds take 3 to 5 business days." },
  { category: "returns", status: "unconfirmed", topic: "Warranty", answer: "Defective items are covered for 7 days, with photo or video proof." },
  { category: "returns", status: "unconfirmed", topic: "Buyer protection", answer: "Every order is covered by buyer protection." },
  { category: "shipping", status: "unconfirmed", topic: "Delivery time", answer: "Standard delivery takes 3 to 5 days; Express takes 1 to 2 days for an extra fee." },
  { category: "shipping", status: "unconfirmed", topic: "Couriers", answer: "J&T Express, LBC and Ninja Van." },
  { category: "other", status: "unconfirmed", topic: "Chat support hours", answer: "8 AM to 10 PM. The platform is online 24/7." },
  { category: "other", status: "unconfirmed", topic: "Flash sales", answer: "Flash sales give up to 50% off." },
];

const CACHE_MS = 60 * 1000;
let cache = { facts: null, at: 0 };
let seeding = null;

function ensureDefaultFacts() {
  seeding ??= (async () => {
    if ((await StoreFact.estimatedDocumentCount()) > 0) return;
    await StoreFact.insertMany(DEFAULT_FACTS.map((fact, index) => ({ ...fact, order: index })));
    console.log("Store facts: added the default facts");
  })().catch((error) => {
    seeding = null; // try again next time
    throw error;
  });
  return seeding;
}

const sortFacts = (facts) =>
  facts.sort((a, b) =>
    FACT_CATEGORIES.indexOf(a.category) - FACT_CATEGORIES.indexOf(b.category) ||
    a.order - b.order ||
    (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0)
  );

// Every fact, confirmed or not, in display order
export async function getAllFacts() {
  await ensureDefaultFacts();
  return sortFacts(await StoreFact.find().lean());
}

// Confirmed facts only, for the bot and the Help Center. Falls back to the defaults if MongoDB fails.
export async function getConfirmedFacts() {
  if (cache.facts && Date.now() - cache.at < CACHE_MS) return cache.facts;
  try {
    const facts = (await getAllFacts()).filter((fact) => fact.status === "confirmed");
    cache = { facts, at: Date.now() };
    return facts;
  } catch (error) {
    console.error("Store facts unavailable, using the defaults:", error.message);
    return DEFAULT_FACTS.filter((fact) => fact.status === "confirmed");
  }
}

// After an admin edit, so the bot and the Help Center use it right away
export function invalidateFactsCache() {
  cache = { facts: null, at: 0 };
}

// For the bot's system prompt: "[Shipping and delivery]\n- Shipping fee: ..."
export function formatFactsForPrompt(facts) {
  return FACT_CATEGORIES
    .map((category) => {
      const lines = facts.filter((fact) => fact.category === category).map((fact) => `- ${fact.topic}: ${fact.answer}`);
      return lines.length > 0 ? `[${CATEGORY_TITLES[category]}]\n${lines.join("\n")}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

// The chat's store policies card: up to two confirmed facts per main topic,
// and the titles of main topics with nothing confirmed yet
const CARD_CATEGORIES = ["shipping", "payments", "cancellations", "returns"];

export async function getPoliciesCard() {
  const facts = await getConfirmedFacts();
  const card = { type: "policies", facts: [], pending: [] };
  for (const category of CARD_CATEGORIES) {
    const inCategory = facts.filter((fact) => fact.category === category).slice(0, 2);
    if (inCategory.length === 0) card.pending.push(CATEGORY_TITLES[category]);
    for (const fact of inCategory) card.facts.push({ category, topic: fact.topic, answer: fact.answer });
  }
  return card;
}
