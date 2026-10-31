import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { axiosInstance } from "../lib/axios.js";
import { getProductImageUrl } from "../lib/utils.js";

// Where the three product cards sit in the square collage (percent of its size), largest first
const CARD_SLOTS = [
  "left-[6%] top-[6%] h-[50%] w-[48%]",
  "left-[58%] top-[19%] h-[44%] w-[37%]",
  "left-[4%] top-[60%] h-[35%] w-[42%]",
];

const LINK_CLASSES =
  "transition duration-200 hover:shadow-xl hover:shadow-primary/15 hover:ring-primary/40 motion-safe:hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// A store product, linking to its page in the store, or a placeholder while the list loads.
// The photo fades in once it has loaded.
const ShowcaseCard = ({ product, className, onImageError }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imageUrl = getProductImageUrl(product);
  const Card = product ? "a" : "div";

  return (
    <Card
      href={product?.link}
      className={`absolute flex flex-col rounded-2xl bg-base-100 p-1.5 shadow-soft ring-1 ring-base-300/70 ${product ? LINK_CLASSES : ""} ${className}`}
    >
      <div className={`min-h-0 flex-1 overflow-hidden rounded-xl ${isLoaded ? "bg-base-200" : "skeleton"}`}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={onImageError}
            className={`size-full object-cover transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>
      <div className="px-2 pb-1 pt-2 text-left">
        {product ? (
          <>
            <span className="block truncate text-sm font-semibold" title={product.name}>{product.name}</span>
            <span className="block text-xs font-bold text-primary">₱{product.price}</span>
          </>
        ) : (
          <span className="skeleton block h-9 w-3/4 rounded-lg" />
        )}
      </div>
    </Card>
  );
};

// Real products from the store the assistant serves, a different mix on each visit.
// The sample picture stands in when the store can't be reached or too few photos load.
const AuthProductShowcase = () => {
  const [products, setProducts] = useState(null); // null while loading
  const [failedIds, setFailedIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    axiosInstance.get("/products/showcase").then(
      (res) => !cancelled && setProducts(Array.isArray(res.data) ? res.data : []),
      () => !cancelled && setProducts([])
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // A photo that doesn't load gives its card to the next product
  const shown = (products ?? []).filter((product) => !failedIds.includes(product.id)).slice(0, CARD_SLOTS.length);
  const showSample = products !== null && shown.length < CARD_SLOTS.length;

  return (
    <aside className="hidden lg:flex flex-col items-center justify-center bg-base-200 px-8 py-10 xl:px-12" aria-label="Shop and connect">
      <div className="w-full max-w-xl text-center">
        {showSample ? (
          <img
            src="/login-products.png"
            alt="Product showcase with purple headphones, white sneakers, a canvas tote, and a Chat with sellers message."
            width="1254"
            height="1254"
            className="mx-auto w-full max-w-[min(100%,58vh)] rounded-3xl"
          />
        ) : (
          <div className="relative mx-auto aspect-square w-full max-w-[min(100%,58vh)] overflow-hidden rounded-3xl bg-primary/5">
            <span className="absolute left-[38%] top-[3%] size-[46%] rounded-full bg-primary/10" aria-hidden="true" />
            <span className="absolute left-[85%] top-[7%] size-[8%] rounded-full bg-primary/15" aria-hidden="true" />
            <span className="absolute -left-[5%] top-[34%] size-[26%] rounded-full bg-primary/10" aria-hidden="true" />
            <span className="absolute left-[55%] top-[62%] size-[30%] rounded-full bg-primary/10" aria-hidden="true" />
            {CARD_SLOTS.map((slot, index) => (
              <ShowcaseCard
                key={shown[index]?.id ?? `slot-${index}`}
                product={shown[index]}
                className={slot}
                onImageError={() => setFailedIds((ids) => [...ids, shown[index].id])}
              />
            ))}
            <p className="absolute left-[50%] top-[73%] flex items-center gap-2.5 rounded-2xl bg-base-100 px-4 py-3 text-lg font-semibold text-primary shadow-soft ring-1 ring-base-300/70">
              <MessageSquare className="size-6" aria-hidden="true" />
              Chat with sellers
            </p>
          </div>
        )}
        <h2 className="mt-5 text-3xl xl:text-4xl font-bold tracking-tight">Discover. Connect. Shop.</h2>
        <p className="mx-auto mt-4 max-w-md text-base xl:text-lg text-base-content/65 leading-relaxed">
          Explore products, chat with sellers, and keep track of your orders.
        </p>
      </div>
    </aside>
  );
};

export default AuthProductShowcase;
