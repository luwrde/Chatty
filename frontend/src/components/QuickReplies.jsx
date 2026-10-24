import { CircleHelp, Package, RotateCcw, Star, Truck } from "lucide-react";

// Each chip sends its text as a normal message (bot chat only)
const QUICK_REPLIES = [
  { icon: Package, text: "Track my order" },
  { icon: RotateCcw, text: "Return & Refund" },
  { icon: Truck, text: "Shipping info" },
  { icon: Star, text: "Best sellers" },
  { icon: CircleHelp, text: "Any other questions?" },
];

const QuickReplies = ({ onSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-thin px-3 pb-1 pt-2 sm:flex-wrap sm:px-5">
      {QUICK_REPLIES.map((reply) => {
        const Icon = reply.icon;
        return (
          <button
            key={reply.text}
            type="button"
            onClick={() => onSelect(reply.text)}
            className="btn btn-sm shrink-0 rounded-full border-primary/20 bg-base-100 font-medium text-primary shadow-none hover:border-primary/40 hover:bg-primary/10"
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {reply.text}
          </button>
        );
      })}
    </div>
  );
};

export default QuickReplies;
