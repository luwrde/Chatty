import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, CircleAlert, Clock, MapPin, MessageSquare, Package, RefreshCw, Sparkles, Truck } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { formatDate, formatPeso } from "../lib/utils";
import { ORDER_STEPS, getStatusBadgeClass, getStatusCaption, isActiveOrder } from "../lib/orders";

const TABS = [
  { key: "all", label: "All", matches: () => true },
  { key: "active", label: "Active", matches: isActiveOrder },
  { key: "completed", label: "Completed", matches: (order) => order.status.isCompleted },
  { key: "cancelled", label: "Cancelled", matches: (order) => order.status.isCancelled },
];

const SHORT_DATE = { month: "short", day: "numeric" };

const StatusBadge = ({ status }) => (
  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(status)}`}>{status.label}</span>
);

const sellerNames = (order) => order.sellers.map((seller) => seller.name).join(", ") || "EcommerSense seller";

// The 7 store steps; done ones get a check, the current one a ring
const OrderTimeline = ({ status }) => {
  const lastStep = ORDER_STEPS.length - 1;
  const filledSteps = status.isCompleted ? lastStep : status.step;
  return (
    <div className="overflow-x-auto rounded-2xl border border-base-300/60 bg-base-200/40 p-4">
      <div className="relative min-w-[36rem]">
        {/* The track runs between the first and last step centers (85.72% of the row) */}
        <span className="absolute left-[7.14%] right-[7.14%] top-[14px] h-[3px] rounded-full bg-base-300" aria-hidden="true" />
        <span
          className="absolute left-[7.14%] top-[14px] h-[3px] rounded-full bg-primary"
          style={{ width: `${(filledSteps / lastStep) * 85.72}%` }}
          aria-hidden="true"
        />
        <ol className="relative grid grid-cols-7">
          {ORDER_STEPS.map((label, index) => {
            const isCurrent = !status.isCompleted && index === status.step;
            const isDone = status.isCompleted || index < status.step;
            return (
              <li key={label} className="flex flex-col items-center gap-2 text-center" aria-current={isCurrent ? "step" : undefined}>
                {isDone ? (
                  <span className="grid size-[30px] place-items-center rounded-full bg-primary text-primary-content">
                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : isCurrent ? (
                  <span className="grid size-[30px] place-items-center rounded-full border-[3px] border-primary bg-base-100 ring-4 ring-primary/15">
                    <span className="size-2 rounded-full bg-primary" />
                  </span>
                ) : (
                  <span className="size-[30px] rounded-full border-2 border-base-300 bg-base-100" />
                )}
                <span className={`text-xs leading-tight ${isCurrent ? "font-bold text-primary" : isDone ? "text-base-content" : "text-base-content/70"}`}>
                  {label}
                  {isDone && <span className="sr-only"> (done)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

const ItemImage = ({ item }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-base-200">
      {item.imageUrl && !failed ? (
        <img src={item.imageUrl} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Package className="size-5 text-base-content/40" aria-hidden="true" />
      )}
    </span>
  );
};

const OrderDetails = ({ order, onAskAi, onMessageSeller }) => {
  const { status } = order;
  const sellerToMessage = order.sellers.find((seller) => seller.chatUserId);
  const delivery = order.estimatedDelivery;

  return (
    <div className="rounded-box border border-base-300/60 bg-base-100 p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">Order #{order.id}</h2>
          <p className="mt-0.5 text-sm text-base-content/75">
            Placed {formatDate(order.placedAt)} · {sellerNames(order)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {status.isCancelled ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-700" aria-hidden="true" />
          <div>
            <p className="font-semibold">This order was cancelled.</p>
            {order.cancellationReason && <p className="mt-0.5">Reason: {order.cancellationReason}</p>}
            {/gcash|e-?wallet/i.test(order.paymentMethod ?? "") && (
              <p className="mt-0.5">Paid by {order.paymentMethod}: by store policy, the full amount goes back to your E-Wallet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {status.step >= 0 ? <OrderTimeline status={status} /> : <p className="text-sm">{getStatusCaption(status)}</p>}
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-base-content/80">
            <li className="flex items-center gap-2">
              <Truck className="size-4 text-primary" aria-hidden="true" />
              Delivered by EcommerSense riders and hubs
            </li>
            {order.hubName && (
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                Now at {order.hubName}
              </li>
            )}
            {order.riderName && (
              <li className="flex items-center gap-2">
                <Truck className="size-4 text-primary" aria-hidden="true" />
                Rider: {order.riderName}
              </li>
            )}
            {delivery && !status.isCompleted && (
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-primary" aria-hidden="true" />
                Arrives {formatDate(delivery.from, SHORT_DATE)}
                {delivery.to !== delivery.from && ` – ${formatDate(delivery.to, SHORT_DATE)}`}
              </li>
            )}
          </ul>
        </div>
      )}

      <h3 className="mt-6 text-sm font-bold">Items</h3>
      {order.items.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {order.items.map((item, index) => (
            <li key={`${item.productId}-${index}`} className="flex items-center gap-3">
              <ItemImage item={item} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-sm text-base-content/70">
                  Qty {item.quantity} · {formatPeso(item.price)} each
                </p>
              </div>
              <p className="font-semibold">{formatPeso(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-base-content/70">The store has no item details for this order.</p>
      )}

      <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-base-300/70 pt-4 text-sm">
        <dt className="text-base-content/75">Items</dt>
        <dd className="text-right">{formatPeso(order.itemsTotal)}</dd>
        <dt className="text-base-content/75">Shipping fee</dt>
        <dd className="text-right">{order.shippingFee > 0 ? formatPeso(order.shippingFee) : "Free"}</dd>
        {order.vat > 0 && (
          <>
            <dt className="text-base-content/75">VAT</dt>
            <dd className="text-right">{formatPeso(order.vat)}</dd>
          </>
        )}
        {order.paymentMethod && (
          <>
            <dt className="text-base-content/75">Payment</dt>
            <dd className="text-right">{order.paymentMethod}</dd>
          </>
        )}
        <dt className="text-base font-bold">Total</dt>
        <dd className="text-right text-base font-bold">{formatPeso(order.total)}</dd>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => onAskAi(order)} className="btn btn-primary grow rounded-full sm:grow-0">
          <Sparkles className="size-4" aria-hidden="true" />
          Ask AI about this order
        </button>
        {sellerToMessage && (
          <button
            type="button"
            onClick={() => onMessageSeller(sellerToMessage)}
            className="btn grow rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/20 sm:grow-0"
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            Message {order.sellers.length > 1 ? sellerToMessage.name : "seller"}
          </button>
        )}
      </div>
    </div>
  );
};

// The buyer's orders from the store database (matched by account email)
const OrdersPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [tab, setTab] = useState("all");
  // "Track order" in the chat opens a specific order
  const [selectedId, setSelectedId] = useState(location.state?.orderId ?? null);
  const detailsRef = useRef(null);

  const fetchOrders = useCallback(
    () =>
      axiosInstance.get("/orders").then(
        (res) => {
          setData(res.data);
          setStatus("ready");
        },
        (error) => {
          console.log("Orders unavailable:", error.message);
          setStatus("error");
        }
      ),
    []
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const retry = () => {
    setStatus("loading");
    fetchOrders();
  };

  const orders = data?.orders ?? [];
  const visibleOrders = orders.filter(TABS.find((t) => t.key === tab).matches);
  const selected = visibleOrders.find((order) => order.id === selectedId) ?? visibleOrders[0] ?? null;

  const selectOrder = (id) => {
    setSelectedId(id);
    // Phones and tablets show the details under the list
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const askAiAboutOrder = (order) => navigate("/", { state: { prompt: `Tell me about my order #${order.id}` } });
  const messageSeller = (seller) => navigate("/", { state: { openUserId: seller.chatUserId } });

  return (
    <div className="min-h-screen bg-base-200 pt-16">
      <main className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">My orders</h1>
            <p className="mt-1 text-sm text-base-content/70">Your EcommerSense orders, with live status from the store.</p>
          </div>
          {status === "ready" && orders.length > 0 && (
            <div role="group" aria-label="Filter orders" className="flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={`btn btn-sm gap-1.5 rounded-full ${tab === t.key ? "btn-primary" : "border-base-300 bg-base-100 font-medium"}`}
                >
                  {t.label}
                  <span className="text-xs">{orders.filter(t.matches).length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {status === "loading" && (
          <div className="mt-6 flex flex-col gap-4 lg:flex-row" aria-label="Loading orders">
            <div className="skeleton h-80 rounded-box lg:w-96" />
            <div className="skeleton h-96 flex-1 rounded-box" />
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 rounded-box border border-base-300/60 bg-base-100 p-8 text-center shadow-soft">
            <Package className="mx-auto size-10 text-base-content/40" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold">We couldn&apos;t reach the store&apos;s orders right now</h2>
            <p className="mt-1 text-sm text-base-content/70">Orders come from the EcommerSense store database. Try again in a moment.</p>
            <button type="button" onClick={retry} className="btn btn-primary btn-sm mt-4 rounded-full">
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {status === "ready" && orders.length === 0 && (
          <div className="mt-6 rounded-box border border-base-300/60 bg-base-100 p-8 text-center shadow-soft">
            <Package className="mx-auto size-10 text-base-content/40" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold">{data.linked ? "No orders yet" : "No store account found"}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-base-content/70">
              {data.linked
                ? "Orders you place in the EcommerSense store show up here."
                : `Orders show up here when you shop in the EcommerSense store with this account's email (${authUser?.email}).`}
            </p>
            <Link to="/store" className="btn btn-primary btn-sm mt-4 rounded-full">
              Browse the Store
            </Link>
          </div>
        )}

        {status === "ready" && orders.length > 0 && (
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
            <section aria-label="Your orders" className="lg:w-96 lg:shrink-0">
              {visibleOrders.length > 0 ? (
                <ul className="space-y-2.5">
                  {visibleOrders.map((order) => {
                    const isSelected = order.id === selected?.id;
                    return (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => selectOrder(order.id)}
                          aria-pressed={isSelected}
                          className={`w-full rounded-2xl border bg-base-100 p-4 text-left transition-colors ${
                            isSelected ? "border-primary ring-1 ring-primary" : "border-base-300/60 hover:border-primary/40"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-bold">Order #{order.id}</span>
                            <StatusBadge status={order.status} />
                          </span>
                          <span className="mt-1 block truncate text-sm font-medium">{sellerNames(order)}</span>
                          <span className="mt-0.5 block text-sm text-base-content/70">
                            {formatDate(order.placedAt, SHORT_DATE)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · {formatPeso(order.total)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-box border border-base-300/60 bg-base-100 p-6 text-center text-sm text-base-content/70">
                  No {TABS.find((t) => t.key === tab).label.toLowerCase()} orders.
                </p>
              )}
            </section>

            <section ref={detailsRef} aria-label="Order details" className="min-w-0 flex-1 scroll-mt-20">
              {selected && <OrderDetails order={selected} onAskAi={askAiAboutOrder} onMessageSeller={messageSeller} />}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;
