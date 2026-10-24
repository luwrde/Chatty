import { ChevronRight, FileText, Package, RotateCcw, Search, Truck, Zap } from "lucide-react";
import BotAvatar from "./BotAvatar";

// Each action sends a preset question as a normal message, so the bot answers it like a typed one
const QUICK_ACTIONS = [
  { icon: Package, title: "Track Order", subtitle: "Check your order status", message: "How can I track my order?" },
  { icon: Search, title: "Find a Product", subtitle: "Search the store's products", message: "Help me find a product." },
  { icon: RotateCcw, title: "Returns & Refunds", subtitle: "Return and refund process", message: "How do returns and refunds work?" },
  { icon: Truck, title: "Shipping Info", subtitle: "Delivery options and fees", message: "What are the shipping options and fees?" },
  { icon: FileText, title: "Store Policies", subtitle: "Payments, orders and more", message: "What are the store policies?" },
];

// Right-hand panel of the bot chat, only on wide screens (xl and up)
const QuickActionsPanel = ({ onSelect, onAskAnything }) => {
  return (
    <aside className="hidden xl:flex w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-box border border-base-300/60 bg-base-100 p-4 shadow-soft">
      <div className="flex items-center gap-2 px-1 pt-1">
        <Zap className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-semibold">Quick Actions</h2>
      </div>

      <div className="flex flex-col gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              type="button"
              onClick={() => onSelect(action.message)}
              className="group flex items-center gap-3 rounded-xl border border-base-300/70 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{action.title}</span>
                <span className="block truncate text-xs text-base-content/60">{action.subtitle}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-base-content/40 group-hover:text-primary" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* Focuses the message input */}
      <button
        type="button"
        onClick={onAskAnything}
        className="mt-auto rounded-box bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15"
      >
        <BotAvatar className="size-10 bg-base-100 text-primary shadow-sm" iconClassName="size-5" />
        <p className="mt-3 text-sm font-semibold">Have a question not related to shopping?</p>
        <p className="mt-0.5 text-sm text-base-content/70">Go ahead, ask me anything!</p>
      </button>
    </aside>
  );
};

export default QuickActionsPanel;
