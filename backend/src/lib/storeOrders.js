import { storeDb, getStoreImageUrl } from "./store.js";

// The store's order steps, in order. Cancelled is not a step.
export const ORDER_STEPS = ["Placed", "Packed", "To Ship", "In Transit", "Arrived at Hub", "To Receive", "Completed"];

// Values of orders.status / orders.tracking_status (normalized) for each step.
// The store writes "pending", "completed" and "cancelled"; the other spellings cover its other screens.
const STEP_ALIASES = [
  ["pending", "placed", "placed order", "placed orders", "processing", "confirmed"],
  ["packed", "order packed", "packing", "to pack"],
  ["to ship", "ready to ship", "for pickup", "ready for pickup"],
  ["in transit", "shipped", "shipping", "picked up"],
  ["arrived at hub", "at hub"],
  ["to receive", "out for delivery", "for delivery"],
  ["completed", "complete", "delivered", "received"],
];
const CANCELLED_ALIASES = ["cancelled", "canceled"];

const MAX_ORDERS = 50;

const normalize = (value) => String(value ?? "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
const getStep = (value) => STEP_ALIASES.findIndex((aliases) => aliases.includes(normalize(value)));
const toTitleCase = (value) => normalize(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
const toAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;

// { label, step, isCancelled, isCompleted }; step is -1 for cancelled and unknown statuses
export function describeOrderStatus(status, trackingStatus) {
  if (CANCELLED_ALIASES.includes(normalize(status))) {
    return { label: "Cancelled", step: -1, isCancelled: true, isCompleted: false };
  }
  // tracking_status can be further along than status
  const step = Math.max(getStep(status), getStep(trackingStatus));
  if (step === -1) return { label: status ? toTitleCase(status) : "Unknown", step: -1, isCancelled: false, isCompleted: false };
  return { label: ORDER_STEPS[step], step, isCancelled: false, isCompleted: step === ORDER_STEPS.length - 1 };
}

// The store account behind a chat account: same email
async function findStoreUserId(email) {
  if (!email) return null;
  const [rows] = await storeDb.query(
    "SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL LIMIT 1",
    [email]
  );
  return rows[0]?.user_id ?? null;
}

// A buyer's store orders, newest first: { linked, orders }. linked is false when no store account has this email.
// Throws when the store database is unreachable. Seller emails are for matching chat accounts, not for buyers.
export async function getOrdersForEmail(email) {
  const storeUserId = await findStoreUserId(email);
  if (!storeUserId) return { linked: false, orders: [] };

  const [orderRows] = await storeDb.query(
    `SELECT o.order_id, o.status, o.tracking_status, o.payment_method, o.created_at, o.total_amount,
            o.shipping_fee, o.vat_amount, o.cancellation_reason, o.est_delivery_min_date, o.est_delivery_max_date,
            o.rider_name, h.hub_name
       FROM orders o
       LEFT JOIN hubs h ON h.id = o.current_hub_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, o.order_id DESC
      LIMIT ?`,
    [storeUserId, MAX_ORDERS]
  );
  if (orderRows.length === 0) return { linked: true, orders: [] };

  // orders.seller_id is not filled in by the store, so each order's sellers come from its products
  const [itemRows] = await storeDb.query(
    `SELECT oi.order_id, oi.product_id, oi.quantity, oi.price,
            COALESCE(NULLIF(p.name, ''), p.product_name) AS name,
            COALESCE(NULLIF(p.image, ''), p.image_url) AS image,
            COALESCE(NULLIF(s.store_name, ''), s.full_name) AS seller_name,
            s.email AS seller_email
       FROM order_items oi
       LEFT JOIN products p ON p.product_id = oi.product_id
       LEFT JOIN users s ON s.user_id = p.seller_id
      WHERE oi.order_id IN (?)
      ORDER BY oi.item_id`,
    [orderRows.map((row) => row.order_id)]
  );

  const itemsByOrder = new Map();
  for (const row of itemRows) {
    if (!itemsByOrder.has(row.order_id)) itemsByOrder.set(row.order_id, []);
    itemsByOrder.get(row.order_id).push(row);
  }

  const orders = orderRows.map((row) => {
    const items = itemsByOrder.get(row.order_id) ?? [];
    const itemsTotal = toAmount(items.reduce((sum, item) => sum + toAmount(item.price) * (Number(item.quantity) || 0), 0));
    const vat = toAmount(row.vat_amount);
    const total = toAmount(row.total_amount) || toAmount(itemsTotal + toAmount(row.shipping_fee) + vat);
    // The store adds shipping into total_amount and leaves shipping_fee at 0, so derive it
    const shippingFee = toAmount(row.shipping_fee) || Math.max(0, toAmount(total - itemsTotal - vat));

    const sellers = new Map();
    for (const item of items) {
      if (item.seller_name && !sellers.has(item.seller_name)) {
        sellers.set(item.seller_name, { name: item.seller_name, email: item.seller_email?.toLowerCase() ?? null });
      }
    }

    return {
      id: row.order_id,
      status: describeOrderStatus(row.status, row.tracking_status),
      placedAt: row.created_at,
      paymentMethod: row.payment_method || null,
      items: items.map((item) => ({
        productId: item.product_id,
        name: item.name || "Product no longer listed",
        quantity: Number(item.quantity) || 0,
        price: toAmount(item.price),
        imageUrl: getStoreImageUrl(item.image),
      })),
      itemCount: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      itemsTotal,
      shippingFee,
      vat,
      total,
      sellers: [...sellers.values()],
      hubName: row.hub_name || null,
      riderName: row.rider_name || null,
      cancellationReason: row.cancellation_reason || null,
      estimatedDelivery: row.est_delivery_min_date
        ? { from: row.est_delivery_min_date, to: row.est_delivery_max_date || row.est_delivery_min_date }
        : null,
    };
  });

  return { linked: true, orders };
}

// Emails of the sellers whose products this buyer ordered (to list them as chats)
export async function getOrderSellerEmails(buyerEmail) {
  const storeUserId = await findStoreUserId(buyerEmail);
  if (!storeUserId) return [];
  const [rows] = await storeDb.query(
    `SELECT DISTINCT s.email
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.order_id
       JOIN products p ON p.product_id = oi.product_id
       JOIN users s ON s.user_id = p.seller_id
      WHERE o.user_id = ? AND s.email IS NOT NULL`,
    [storeUserId]
  );
  return rows.map((row) => row.email.toLowerCase());
}
