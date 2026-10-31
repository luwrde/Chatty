import { useState } from "react";
import { Archive, ChevronRight, Plus, Search } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { BOT_DISPLAY_NAME } from "../constants";
import BotAvatar from "./BotAvatar";
import ChatHistoryItem from "./ChatHistoryItem";

// A buyer's chats: the assistant first, then the stores they ordered from and anyone they already chat with
// (the server only sends buyers those contacts), then their earlier chats with the assistant (Chat history).
// Desktop: left panel. Phones: inside the drawer (inDrawer).
const ChatsPanel = ({ botChatUser, onSelectChat, inDrawer = false }) => {
  const {
    users,
    selectedUser,
    setSelectedUser,
    conversations,
    conversationsLoaded,
    activeConversationId,
    openConversation,
    startNewConversation,
  } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const search = query.trim().toLowerCase();
  const matches = (name) => name.toLowerCase().includes(search);
  const others = users.filter((user) => user._id !== botChatUser?._id && matches(user.fullName));
  const sellers = others.filter((user) => user.role === "admin");
  const people = others.filter((user) => user.role !== "admin");
  // Chat history: pinned chats first, then the rest by their latest message. Archived ones are listed apart.
  const listed = conversations.filter((conversation) => !conversation.archived && matches(conversation.title));
  const history = [...listed.filter((conversation) => conversation.pinned), ...listed.filter((conversation) => !conversation.pinned)];
  const archived = conversations.filter((conversation) => conversation.archived && matches(conversation.title));
  const isArchivedOpen = showArchived || Boolean(search); // a search shows the archived chats it finds
  const isAssistantOpen = Boolean(botChatUser) && selectedUser?._id === botChatUser._id;
  const historyNote = search
    ? archived.length > 0 ? null : "No matching chats."
    : `Your chats with ${BOT_DISPLAY_NAME} appear here.`;

  const renderChat = (user, { name, subtitle, avatar }) => {
    const isSelected = selectedUser?._id === user._id;
    return (
      <li key={user._id}>
        <button
          type="button"
          onClick={() => {
            setSelectedUser(user);
            onSelectChat?.();
          }}
          aria-current={isSelected ? "true" : undefined}
          className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${
            isSelected ? "bg-primary/10 ring-1 ring-primary/25" : "hover:bg-base-200"
          }`}
        >
          {avatar}
          <span className="min-w-0">
            <span className="block truncate font-semibold">{name}</span>
            <span className="block truncate text-xs text-base-content/70">{subtitle}</span>
          </span>
        </button>
      </li>
    );
  };

  const renderHistoryItem = (conversation) => (
    <ChatHistoryItem
      key={conversation._id}
      conversation={conversation}
      isOpen={isAssistantOpen && conversation._id === activeConversationId}
      onOpen={() => {
        openConversation(botChatUser, conversation._id);
        onSelectChat?.();
      }}
    />
  );

  const renderPerson = (user) =>
    renderChat(user, {
      name: user.fullName,
      subtitle: onlineUsers?.includes(user._id) ? "Online" : "Offline",
      avatar: (
        <span className="relative shrink-0">
          <img src={user.profilePic || "/avatar.png"} alt="" className="size-11 rounded-full object-cover" />
          {onlineUsers?.includes(user._id) && (
            <span className="absolute bottom-0 right-0 size-3 rounded-full bg-success ring-2 ring-base-100" aria-hidden="true" />
          )}
        </span>
      ),
    });

  return (
    <aside
      aria-label="Chats"
      className={
        inDrawer
          ? "flex h-full flex-col gap-3 overflow-y-auto p-4 pt-5"
          : "hidden md:flex h-full w-64 lg:w-72 shrink-0 flex-col gap-3 overflow-y-auto rounded-box border border-base-300/60 bg-base-100 p-4 shadow-soft"
      }
    >
      <h2 className="px-1 text-base font-bold">Chats</h2>

      <label className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-base-200 px-3.5 text-base-content/60 focus-within:ring-2 focus-within:ring-primary/30">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="min-w-0 flex-1 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/60"
        />
      </label>

      {botChatUser && matches(BOT_DISPLAY_NAME) && (
        <ul>
          {renderChat(botChatUser, {
            name: BOT_DISPLAY_NAME,
            subtitle: "AI assistant · replies instantly",
            avatar: <BotAvatar className="size-11 bg-base-100 text-primary shadow-sm ring-1 ring-base-300" iconClassName="size-6" />,
          })}
        </ul>
      )}

      <div>
        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-base-content/70">Sellers</h3>
        {sellers.length > 0 ? (
          <ul className="mt-1 space-y-1">{sellers.map(renderPerson)}</ul>
        ) : (
          <p className="px-1 pt-1 text-xs text-base-content/70">
            {search ? "No matching sellers." : "Stores you've ordered from appear here."}
          </p>
        )}
      </div>

      {people.length > 0 && (
        <div>
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-base-content/70">Other chats</h3>
          <ul className="mt-1 space-y-1">{people.map(renderPerson)}</ul>
        </div>
      )}

      {botChatUser && (
        <div>
          <div className="flex items-center justify-between gap-2 pl-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/70">Chat history</h3>
            <button
              type="button"
              onClick={() => {
                startNewConversation(botChatUser);
                onSelectChat?.();
              }}
              className="btn btn-ghost btn-xs h-7 gap-1 rounded-full px-2.5 text-primary hover:bg-primary/10"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              New chat
            </button>
          </div>

          {!conversationsLoaded ? (
            <div className="mt-1 space-y-1.5" aria-label="Loading chat history">
              <div className="skeleton h-9 rounded-xl" />
              <div className="skeleton h-9 rounded-xl" />
            </div>
          ) : history.length > 0 ? (
            <ul className="mt-1 space-y-0.5">{history.map(renderHistoryItem)}</ul>
          ) : (
            historyNote && <p className="px-1 pt-1 text-xs text-base-content/70">{historyNote}</p>
          )}

          {conversationsLoaded && archived.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                aria-expanded={isArchivedOpen}
                className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold text-base-content/70 hover:text-base-content"
              >
                <ChevronRight className={`size-3.5 transition-transform ${isArchivedOpen ? "rotate-90" : ""}`} aria-hidden="true" />
                <Archive className="size-3.5" aria-hidden="true" />
                Archived ({archived.length})
              </button>
              {isArchivedOpen && <ul className="mt-0.5 space-y-0.5">{archived.map(renderHistoryItem)}</ul>}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default ChatsPanel;
