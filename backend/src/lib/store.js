import mysql from "mysql2/promise";

// The PHP store (EcommerSense): its pages and the MySQL database behind them
export const STORE_BASE_URL = "http://localhost/ecommerce";

export const storeDb = mysql.createPool({
  host:     "localhost",
  user:     "root",
  password: "",
  database: "ecommerse_db",
  connectTimeout: 5000,     // fail fast when MySQL is off, so pages and the bot don't hang
  dateStrings: ["DATE"],    // estimated delivery dates stay "YYYY-MM-DD", no timezone shift
});

// Product images are file names in the store's uploads/ folder (or full URLs)
export const getStoreImageUrl = (image) => {
  if (!image) return null;
  return /^https?:\/\//i.test(image) ? image : `${STORE_BASE_URL}/uploads/${encodeURIComponent(image)}`;
};

// Product ids with the store's Free Shipping badge. Empty when the database is unreachable.
export async function getFreeShippingProductIds() {
  try {
    const [rows] = await storeDb.query("SELECT product_id FROM products WHERE is_freeship = 1 AND deleted_at IS NULL");
    return new Set(rows.map((row) => String(row.product_id)));
  } catch (error) {
    console.log("Free shipping flags unavailable:", error.message);
    return new Set();
  }
}
