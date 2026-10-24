import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { axiosInstance } from "../lib/axios";

// Product details by id from the store feed, shared by all cards so each product is fetched once
const productCache = new Map();

const pickCached = (idsKey) =>
  Object.fromEntries(idsKey.split(",").filter((id) => productCache.has(id)).map((id) => [id, productCache.get(id)]));

// Same rule as the store's own pages: the feed has a file name, the file lives in uploads/ next to user-home.php
const getImageUrl = (product) => {
  if (!product.image) return null;
  try {
    return /^https?:\/\//i.test(product.image) ? product.image : new URL(`uploads/${product.image}`, product.link).href;
  } catch {
    return null;
  }
};

const STOCK_LABELS = {
  "In Stock": { className: "text-success", text: () => "In Stock" },
  "Low Stock": { className: "text-warning", text: (product) => `Low Stock · ${product.stock} left` },
  "Out of Stock": { className: "text-error", text: () => "Out of Stock" },
};

const ProductCard = ({ product, onView, onMoreOptions }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : getImageUrl(product);
  const stock = STOCK_LABELS[product.status];

  return (
    <div className="w-72 max-w-full shrink-0 snap-start rounded-box border border-base-300 bg-base-100 p-3 shadow-soft">
      <div className="flex gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-base-200 grid place-items-center">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="size-full object-cover" onError={() => setImageFailed(true)} />
          ) : (
            <Package className="size-6 text-base-content/40" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold leading-snug line-clamp-2">{product.name}</p>
          {product.price && <p className="mt-0.5 text-sm font-bold text-primary">₱{product.price}</p>}
          {stock && (
            <p className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${stock.className}`}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {stock.text(product)}
            </p>
          )}
        </div>
      </div>

      {/* Side by side; stacked when the card is too narrow */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onView} className="btn btn-primary btn-sm grow basis-[7.5rem] rounded-full px-2 text-xs">
          View Product
        </button>
        <button
          type="button"
          onClick={() => onMoreOptions(product.name)}
          className="btn btn-sm grow basis-[7.5rem] rounded-full border-0 bg-primary/10 px-2 text-xs text-primary hover:bg-primary/20"
        >
          See Other Options
        </button>
      </div>
    </div>
  );
};

// Cards for the store product links in a bot message. Without product details nothing is shown:
// the links in the message text keep working on their own.
const ProductCards = ({ links, onView, onMoreOptions, onLoad }) => {
  const idsKey = links.map((link) => link.productId).join(",");
  const [products, setProducts] = useState(() => pickCached(idsKey));
  const [isFetching, setIsFetching] = useState(() => idsKey.split(",").some((id) => !productCache.has(id)));

  useEffect(() => {
    const missing = idsKey.split(",").filter((id) => !productCache.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    axiosInstance
      .get("/products", { params: { ids: missing.join(",") } })
      .then((res) => {
        res.data.forEach((product) => productCache.set(String(product.id), product));
        if (!cancelled) setProducts(pickCached(idsKey));
      })
      .catch((error) => console.log("Product details unavailable:", error.message))
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const cards = links.filter((link) => products[link.productId]);

  // Cards appear after the message is rendered, so scroll again to keep them in view
  useEffect(() => {
    if (cards.length > 0) onLoad?.();
  }, [cards.length, onLoad]);

  if (cards.length === 0) {
    return isFetching ? <div className="mt-2 h-28 w-72 max-w-full rounded-box skeleton" aria-hidden="true" /> : null;
  }

  return (
    <div className={`mt-2 flex w-full gap-2 ${cards.length > 1 ? "overflow-x-auto snap-x snap-mandatory scrollbar-thin pb-2" : ""}`}>
      {cards.map(({ url, productId }) => (
        <ProductCard
          key={productId}
          product={products[productId]}
          onView={() => onView(url, productId)}
          onMoreOptions={onMoreOptions}
        />
      ))}
    </div>
  );
};

export default ProductCards;
