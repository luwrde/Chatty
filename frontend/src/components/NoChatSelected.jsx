import { MessageCircle, MessagesSquare } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { BOT_DISPLAY_NAME, BOT_FEATURES } from "../constants";
import BotAvatar from "./BotAvatar";

const NoChatSelected = ({ onOpenMessages }) => {
  const { users, setSelectedUser } = useChatStore();
  // Same contact embed mode opens for the bot chat
  const botChatUser = users.find((u) => u.role === "admin");

  return (
    <div className="flex-1 min-w-0 overflow-y-auto rounded-box border border-base-300/60 bg-base-100 shadow-soft">
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-8 text-center sm:px-8">
        <BotAvatar className="size-20 bg-primary/10 text-primary ring-8 ring-primary/5" iconClassName="size-10" />

        {/* Welcome Text */}
        <h2 className="mt-5 text-2xl font-bold">{BOT_DISPLAY_NAME}</h2>
        <p className="mt-1 text-lg font-semibold text-primary">Ask me anything!</p>
        <p className="mt-1 text-sm text-base-content/60">I&apos;m here to help, especially with shopping.</p>

        <ul className="mt-6 w-full space-y-2 text-left">
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

        {botChatUser && (
          <button
            type="button"
            onClick={() => setSelectedUser(botChatUser)}
            className="btn btn-primary mt-6 w-full rounded-full"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            Chat with {BOT_DISPLAY_NAME}
          </button>
        )}

        {/* Buyers: the contacts list is in the Messages drawer, not on screen */}
        {onOpenMessages ? (
          <button type="button" onClick={onOpenMessages} className="btn btn-ghost mt-2 w-full rounded-full text-primary">
            <MessagesSquare className="size-5" aria-hidden="true" />
            Messages
          </button>
        ) : (
          <p className="mt-4 text-sm text-base-content/50">
            Select a conversation from the sidebar to start chatting
          </p>
        )}
      </div>
    </div>
  );
};

export default NoChatSelected;
