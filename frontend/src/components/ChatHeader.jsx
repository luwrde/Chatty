import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { BOT_DISPLAY_NAME } from "../constants";
import BotAvatar from "./BotAvatar";

const ChatHeader = ({ isBotChat = false }) => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  // The bot is always online; other chats use the existing online status
  const isOnline = isBotChat || onlineUsers.includes(selectedUser._id);

  return (
    <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary/85 text-primary-content">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
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
            <p className="text-xs text-primary-content/80 flex items-center gap-1.5 min-w-0">
              <span
                className={`size-2 shrink-0 rounded-full ${isOnline ? "bg-success" : "bg-primary-content/40"}`}
                aria-hidden="true"
              />
              <span className="truncate">
                {isOnline ? "Online" : "Offline"}
                {/* Bot chat: messages still go to this contact, so keep their name visible */}
                {isBotChat && ` · Support: ${selectedUser.fullName}`}
              </span>
            </p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-ghost btn-sm btn-circle shrink-0 text-primary-content hover:bg-primary-content/15"
          aria-label="Close chat"
          title="Close chat"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
