import { Link } from "react-router-dom";
import { ArrowRight, CircleHelp, Package } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { FACT_CATEGORIES } from "../constants";
import { formatPeso } from "../lib/utils";
import { ORDER_STEPS, getStatusBadgeClass, getStatusCaption } from "../lib/orders";

// In-app link. In the store's embedded chat it opens the app in a new tab instead.
const AppLink = ({ to, state, embedMode, className, children }) =>
  embedMode ? (
    <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link to={to} state={state} className={className}>
      {children}
    </Link>
  );

// The bot's summary of store policies: the same confirmed facts as the Help Center
const PolicyCard = ({ card, embedMode }) => (
  <div className="mt-2 w-full max-w-md overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-soft">
    <ul className="divide-y divide-base-300/70">
      {card.facts.map((fact) => {
        const Icon = FACT_CATEGORIES.find((category) => category.key === fact.category)?.icon ?? CircleHelp;
        return (
          <li key={`${fact.category}-${fact.topic}`} className="flex items-start gap-3 px-3.5 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 text-sm">
              <span className="block font-semibold">{fact.topic}</span>
              <span className="block text-base-content/75">{fact.answer}</span>
            </span>
          </li>
        );
      })}
    </ul>
    {card.pending?.length > 0 && (
      <p className="border-t border-base-300/70 px-3.5 py-2.5 text-xs text-base-content/75">
        Not published yet: {card.pending.join(", ")}. Tap Talk to a person for those.
      </p>
    )}
    <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-base-300/70 bg-base-200/50 px-3.5 py-1">
      <span className="text-xs text-base-content/75">Source: Help Center</span>
      <AppLink to="/help" embedMode={embedMode} className="btn btn-ghost btn-sm gap-1 px-2 text-primary">
        Open Help Center
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </AppLink>
    </div>
  </div>
);

// One of the buyer's orders, from the store database
const OrderCard = ({ order, embedMode }) => {
  const { users, setSelectedUser } = useChatStore();
  // Only sellers in the buyer's chat list can be messaged (the server lists the stores they ordered from)
  const seller = order.sellerChatId ? users.find((user) => user._id === order.sellerChatId) : null;
  const details = [
    order.sellerName,
    `${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`,
    formatPeso(order.total),
    order.paymentMethod,
  ].filter(Boolean);

  return (
    <div className="mt-2 w-80 max-w-full rounded-box border border-base-300 bg-base-100 p-3.5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <Package className="size-4 text-primary" aria-hidden="true" />
          Order #{order.id}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(order.status)}`}>
          {order.status.label}
        </span>
      </div>
      <p className="mt-1 text-sm text-base-content/75">{details.join(" · ")}</p>

      {order.status.step >= 0 && (
        <div className="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
          {ORDER_STEPS.map((step, index) => (
            <span key={step} className={`h-1.5 rounded-full ${index <= order.status.step ? "bg-primary" : "bg-base-300"}`} />
          ))}
        </div>
      )}
      <p className="mt-1.5 text-xs text-base-content/75">{getStatusCaption(order.status)}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <AppLink to="/orders" state={{ orderId: order.id }} embedMode={embedMode} className="btn btn-primary btn-sm grow rounded-full">
          Track order
        </AppLink>
        {seller && !embedMode && (
          <button
            type="button"
            onClick={() => setSelectedUser(seller)}
            className="btn btn-sm grow rounded-full border-0 bg-primary/10 text-primary hover:bg-primary/20"
          >
            Message seller
          </button>
        )}
      </div>
    </div>
  );
};

// The card a bot reply carries (message.card), drawn under its text
const ChatCard = ({ card, embedMode = false }) => {
  if (card?.type === "policies") return <PolicyCard card={card} embedMode={embedMode} />;
  if (card?.type === "order" && card.order) return <OrderCard order={card.order} embedMode={embedMode} />;
  return null;
};

export default ChatCard;
