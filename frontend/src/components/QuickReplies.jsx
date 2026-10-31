import { useNavigate } from "react-router-dom";

// The bot chat's suggestion row. Each chip sends its text as a normal message, or opens a page ("to").
// In the store's embedded chat a page opens in a new tab.
const QuickReplies = ({ suggestions, onSelect, embedMode = false }) => {
  const navigate = useNavigate();

  const select = (reply) => {
    if (!reply.to) return onSelect(reply.text);
    if (embedMode) window.open(reply.to, "_blank", "noopener,noreferrer");
    else navigate(reply.to);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin px-3 pb-1 pt-2 sm:flex-wrap sm:px-5">
      <span className="hidden shrink-0 text-xs font-semibold text-base-content/70 sm:inline">Suggested</span>
      {suggestions.map((reply) => {
        const Icon = reply.icon;
        return (
          <button
            key={reply.text}
            type="button"
            onClick={() => select(reply)}
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
