import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, ExternalLink, Package, RefreshCw, Search, SlidersHorizontal, Sparkles, Star } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { getProductImageUrl, parsePrice } from "../lib/utils";

const SORTS = {
  rating: { label: "Top rated", compare: (a, b) => Number(b.rating || 0) - Number(a.rating || 0) || Number(b.reviews || 0) - Number(a.reviews || 0) },
  priceLow: { label: "Price: low to high", compare: (a, b) => parsePrice(a.price) - parsePrice(b.price) },
  priceHigh: { label: "Price: high to low", compare: (a, b) => parsePrice(b.price) - parsePrice(a.price) },
};

// The feed's stock status as a badge (light colors, readable on every theme)
const STOCK_BADGES = {
  "In Stock": { className: "bg-green-100 text-green-800", text: () => "In Stock" },
  "Low Stock": { className: "bg-amber-100 text-amber-800", text: (product) => `Low Stock · ${product.stock} left` },
  "Out of Stock": { className: "bg-red-100 text-red-700", text: () => "Out of Stock" },
};

const ProductTile = ({ product, onAsk }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : getProductImageUrl(product);
  const stock = STOCK_BADGES[product.status];
  const isOutOfStock = product.status === "Out of Stock";

  return (
    <article className="flex flex-col overflow-hidden rounded-box border border-base-300/60 bg-base-100 shadow-soft">
      <div className="relative grid aspect-[4/3] place-items-center bg-base-200">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover" onError={() => setImageFailed(true)} />
        ) : (
          <Package className="size-10 text-base-content/30" aria-hidden="true" />
        )}
        {product.freeShipping && (
          <span className="absolute left-3 top-3 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
            Free Shipping
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{product.name}</h3>
        <p className="text-base font-bold text-primary">₱{product.price}</p>
        {Number(product.rating) > 0 && (
          <p className="flex items-center gap-1 text-xs text-base-content/75">
            <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-semibold text-base-content">{product.rating}</span>
            <span>({product.reviews} reviews)</span>
          </p>
        )}
        {product.store && (
          <p className="flex min-w-0 items-center gap-1 text-xs text-base-content/75">
            <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{product.store}</span>
          </p>
        )}
        {stock && (
          <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${stock.className}`}>{stock.text(product)}</span>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm grow basis-0 rounded-full border-0 bg-primary/10 px-2 text-primary hover:bg-primary/20"
          >
            View
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <button type="button" onClick={() => onAsk(product)} className="btn btn-primary btn-sm grow basis-0 rounded-full px-2">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {isOutOfStock ? "Find similar" : "Ask AI"}
          </button>
        </div>
      </div>
    </article>
  );
};

// The store's products, from the same feed the bot uses. "Ask AI" hands the product to the assistant.
const StorePage = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable | error
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedSellers, setSelectedSellers] = useState([]);
  const [sort, setSort] = useState("rating");
  const [showFilters, setShowFilters] = useState(false); // phones: the filters are folded

  const fetchCatalog = useCallback(
    () =>
      axiosInstance.get("/products/catalog").then(
        (res) => {
          setCatalog(res.data);
          setStatus(res.data.available ? "ready" : "unavailable");
        },
        (error) => {
          console.log("Store catalog unavailable:", error.message);
          setStatus("error");
        }
      ),
    []
  );

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const retry = () => {
    setStatus("loading");
    fetchCatalog();
  };

  const products = useMemo(() => {
    if (!catalog) return [];
    const search = query.trim().toLowerCase();
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    return catalog.products
      .filter((product) => category === "All" || product.category === category)
      .filter((product) => !inStockOnly || product.status !== "Out of Stock")
      .filter((product) => !freeShippingOnly || product.freeShipping)
      .filter((product) => selectedSellers.length === 0 || selectedSellers.includes(product.store))
      .filter((product) => {
        const price = parsePrice(product.price);
        return (min === null || price >= min) && (max === null || price <= max);
      })
      .filter((product) => !search || [product.name, product.category, product.store].some((value) => String(value ?? "").toLowerCase().includes(search)))
      .sort(SORTS[sort].compare);
  }, [catalog, query, category, inStockOnly, freeShippingOnly, selectedSellers, minPrice, maxPrice, sort]);

  const hasFilters = category !== "All" || inStockOnly || freeShippingOnly || selectedSellers.length > 0 || minPrice !== "" || maxPrice !== "" || query.trim() !== "";
  const anyFreeShipping = catalog?.products.some((product) => product.freeShipping);

  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setInStockOnly(false);
    setFreeShippingOnly(false);
    setSelectedSellers([]);
    setMinPrice("");
    setMaxPrice("");
  };

  const toggleSeller = (store) =>
    setSelectedSellers((sellers) => (sellers.includes(store) ? sellers.filter((seller) => seller !== store) : [...sellers, store]));

  const askAboutProduct = (product) => {
    const prompt = product.status === "Out of Stock"
      ? `Show me other options similar to ${product.name}`
      : `Tell me about ${product.name}`;
    navigate("/", { state: { prompt } });
  };

  const filterHeading = "mb-2 text-xs font-bold uppercase tracking-wide text-base-content/70";

  return (
    <div className="min-h-screen bg-base-200 pt-16">
      <main className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Store</h1>
            <p className="mt-1 text-sm text-base-content/70">Products from verified sellers. Prices and stock come straight from the store.</p>
          </div>
          <label className="flex h-11 w-full items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 text-base-content/60 focus-within:ring-2 focus-within:ring-primary/30 sm:w-96">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories or sellers"
              aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/60"
              disabled={status !== "ready"}
            />
          </label>
        </div>

        {status === "loading" && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Loading products">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="skeleton h-72 rounded-box" />
            ))}
          </div>
        )}

        {(status === "error" || status === "unavailable") && (
          <div className="mt-6 rounded-box border border-base-300/60 bg-base-100 p-8 text-center shadow-soft">
            <Package className="mx-auto size-10 text-base-content/40" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold">We couldn&apos;t reach the store right now</h2>
            <p className="mt-1 text-sm text-base-content/70">The product list comes from the EcommerSense store. Check that it&apos;s running, then try again.</p>
            <button type="button" onClick={retry} className="btn btn-primary btn-sm mt-4 rounded-full">
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
            <aside aria-label="Filters" className="lg:w-64 lg:shrink-0">
              <button
                type="button"
                onClick={() => setShowFilters((open) => !open)}
                aria-expanded={showFilters}
                aria-controls="store-filters"
                className="btn btn-sm rounded-full border-base-300 bg-base-100 lg:hidden"
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filters
              </button>

              <div
                id="store-filters"
                className={`${showFilters ? "mt-3 flex" : "hidden"} flex-col gap-5 rounded-box border border-base-300/60 bg-base-100 p-4 shadow-soft lg:mt-0 lg:flex`}
              >
                <div>
                  <h2 className={filterHeading}>Categories</h2>
                  <ul className="space-y-1">
                    {[{ name: "All", count: catalog.products.length }, ...catalog.categories].map((item) => (
                      <li key={item.name}>
                        <button
                          type="button"
                          onClick={() => setCategory(item.name)}
                          aria-pressed={category === item.name}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                            category === item.name ? "bg-primary/10 font-semibold text-primary" : "hover:bg-base-200"
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="text-xs">{item.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <fieldset>
                  <legend className={filterHeading}>Availability</legend>
                  <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                    In stock only
                  </label>
                  {anyFreeShipping && (
                    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
                      <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={freeShippingOnly} onChange={(e) => setFreeShippingOnly(e.target.checked)} />
                      Free Shipping badge
                    </label>
                  )}
                </fieldset>

                <fieldset>
                  <legend className={filterHeading}>Price (₱)</legend>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="input input-bordered input-sm w-full min-w-0" />
                    <span className="text-sm text-base-content/70" aria-hidden="true">to</span>
                    <input type="number" min="0" inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="input input-bordered input-sm w-full min-w-0" />
                  </div>
                </fieldset>

                {catalog.sellers.length > 0 && (
                  <fieldset>
                    <legend className={filterHeading}>Verified sellers</legend>
                    {catalog.sellers.map((seller) => (
                      <label key={seller.store} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
                        <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={selectedSellers.includes(seller.store)} onChange={() => toggleSeller(seller.store)} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{seller.store}</span>
                          <span className="block text-xs text-base-content/70">
                            {Number(seller.rating) > 0 ? `Rated ${seller.rating} · ` : ""}
                            {seller.productCount} product{Number(seller.productCount) === 1 ? "" : "s"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}

                {hasFilters && (
                  <button type="button" onClick={clearFilters} className="btn btn-ghost btn-sm rounded-full text-primary">
                    Clear filters
                  </button>
                )}
              </div>
            </aside>

            <section aria-label="Products" className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold" aria-live="polite">
                  {products.length} product{products.length === 1 ? "" : "s"}
                  {category !== "All" && ` in ${category}`}
                </p>
                <label className="flex items-center gap-2 text-sm text-base-content/75">
                  Sort by
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="select select-bordered select-sm">
                    {Object.entries(SORTS).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {products.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductTile key={product.id} product={product} onAsk={askAboutProduct} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-box border border-base-300/60 bg-base-100 p-8 text-center shadow-soft">
                  <p className="font-semibold">No products match your filters.</p>
                  {hasFilters && (
                    <button type="button" onClick={clearFilters} className="btn btn-primary btn-sm mt-3 rounded-full">
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default StorePage;
