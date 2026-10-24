import { Headphones, MessagesSquare } from "lucide-react";
import { BOT_DISPLAY_NAME, BOT_FEATURES } from "../constants";
import BotAvatar from "./BotAvatar";

// Left panel for buyers (tablet and up): the assistant instead of the contacts list.
// Without a bot chat contact, onOpenBotChat/onTalkToSupport are undefined and their buttons are disabled.
const AssistantPanel = ({ isBotChatOpen, onOpenBotChat, onTalkToSupport, onOpenMessages }) => {
  return (
    <aside className="hidden md:flex h-full w-64 lg:w-72 shrink-0 flex-col gap-5 overflow-y-auto rounded-box border border-base-300/60 bg-base-100 p-4 shadow-soft">
      {/* Bot card: opens the bot chat */}
      <button
        type="button"
        onClick={onOpenBotChat}
        disabled={!onOpenBotChat}
        className={`flex items-center gap-3 rounded-box p-3 text-left transition-colors disabled:opacity-50 ${
          isBotChatOpen ? "bg-primary/10 ring-1 ring-primary/20" : "bg-base-200/70 hover:bg-primary/10"
        }`}
      >
        <BotAvatar className="size-12 bg-base-100 text-primary shadow-sm" iconClassName="size-6" />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{BOT_DISPLAY_NAME}</span>
          <span className="flex items-center gap-1.5 text-xs text-base-content/60">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            Online
          </span>
          <span className="block text-sm font-medium text-primary">Ask me anything!</span>
        </span>
      </button>

      <div>
        <h2 className="px-1 text-sm font-semibold text-base-content/70">What I can help with</h2>
        <ul className="mt-2 space-y-2">
          {BOT_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.title} className="flex items-center gap-3 rounded-xl bg-base-200/70 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-base-100 text-primary shadow-sm">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{feature.title}</span>
                  <span className="block text-xs text-base-content/60">{feature.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto space-y-2">
        <button
          type="button"
          onClick={onTalkToSupport}
          disabled={!onTalkToSupport}
          className="btn btn-outline btn-primary w-full rounded-full"
        >
          <Headphones className="size-4" aria-hidden="true" />
          Talk to support
        </button>
        <button type="button" onClick={onOpenMessages} className="btn w-full rounded-full border-0 bg-base-200 hover:bg-base-300">
          <MessagesSquare className="size-4" aria-hidden="true" />
          Messages
        </button>
      </div>
    </aside>
  );
};

export default AssistantPanel;
