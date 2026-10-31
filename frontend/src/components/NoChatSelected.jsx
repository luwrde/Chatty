import { MessagesSquare } from "lucide-react";
import BotAvatar from "./BotAvatar";

// No chat open: admins pick one from their contacts; buyers pick one from Chats (on phones, from the drawer)
const NoChatSelected = ({ isAdmin = false, onOpenChats }) => {
  return (
    <div className="flex-1 min-w-0 overflow-y-auto rounded-box border border-base-300/60 bg-base-100 shadow-soft">
      <div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center px-6 py-10 text-center">
        <BotAvatar className="size-16 bg-primary/10 text-primary ring-8 ring-primary/5" iconClassName="size-8" />
        <h2 className="mt-5 text-xl font-bold">No chat open</h2>
        <p className="mt-1 text-sm text-base-content/70">
          {isAdmin ? "Select a conversation from the sidebar to start chatting." : "Pick a chat to start."}
        </p>
        {onOpenChats && (
          <button type="button" onClick={onOpenChats} className="btn btn-primary mt-6 rounded-full md:hidden">
            <MessagesSquare className="size-5" aria-hidden="true" />
            Open chats
          </button>
        )}
      </div>
    </div>
  );
};

export default NoChatSelected;
