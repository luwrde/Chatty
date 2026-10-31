import { Headphones, MessagesSquare } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { BOT_DISPLAY_NAME } from "../constants";
import BotAvatar from "./BotAvatar";

// onOpenChats: phones only, opens the chat list. onTalkToSupport: the bot chat's one way to reach a person.
const ChatHeader = ({ isBotChat = false, onOpenChats, onTalkToSupport }) => {
  const { selectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  // The bot is always online; other chats use the existing online status
  const isOnline = isBotChat || onlineUsers.includes(selectedUser._id);

  return (
    <div className="bg-primary px-3 py-3 text-primary-content sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {onOpenChats && (
            <button
              type="button"
              onClick={onOpenChats}
              className="btn btn-ghost btn-sm btn-circle shrink-0 text-primary-content hover:bg-primary-content/15 md:hidden"
              aria-label="All chats"
              title="All chats"
            >
              <MessagesSquare className="size-5" />
            </button>
          )}

          {/* Avatar */}
          {isBotChat ? (
            <BotAvatar className="size-10 bg-base-100 text-primary shadow-sm" iconClassName="size-6" />
          ) : (
            <div className="avatar shrink-0">
              <div className="size-10 rounded-full ring-2 ring-primary-content/30">
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              </div>
            </div>
          )}

          {/* User info */}
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight truncate">
              {isBotChat ? BOT_DISPLAY_NAME : selectedUser.fullName}
            </h3>
            <p className="text-xs flex items-center gap-1.5 min-w-0">
              <span
                className={`size-2 shrink-0 rounded-full ${isOnline ? "bg-success" : "bg-primary-content/40"}`}
                aria-hidden="true"
              />
              <span className="truncate">
                {isBotChat ? "Online · AI shopping assistant" : isOnline ? "Online" : "Offline"}
              </span>
            </p>
          </div>
        </div>

        {onTalkToSupport && (
          <button
            type="button"
            onClick={onTalkToSupport}
            className="btn btn-sm shrink-0 gap-2 rounded-full border border-primary-content bg-transparent text-primary-content hover:border-primary-content hover:bg-primary-content/15"
            title="Talk to a person"
          >
            <Headphones className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Talk to a person</span>
          </button>
        )}
      </div>
    </div>
  );
};
export default ChatHeader;
