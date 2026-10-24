import { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";
import AssistantPanel from "../components/AssistantPanel";
import ContactsDrawer from "../components/ContactsDrawer";
import { SUPPORT_REQUEST_TEXT } from "../constants";

const isEmbedMode = () => new URLSearchParams(window.location.search).get("embed") === "1";

const HomePage = () => {
  const { selectedUser, setSelectedUser, getUsers, users } = useChatStore();
  const { authUser } = useAuthStore();
  const embedMode = isEmbedMode();
  // Admins keep the contacts list as their left panel (they reply to buyers from it)
  const isAdmin = authUser?.role === "admin";
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const botChatOpenedRef = useRef(false);
  // The bot chat: the admin contact, the same chat embed mode opens
  const botChatUser = users.find((u) => u.role === "admin");

  useEffect(() => {
    if (embedMode) {
      getUsers();
    }
  }, [embedMode, getUsers]);

  useEffect(() => {
    if (embedMode && users.length > 0 && !selectedUser) {
      const admin = users.find((u) => u.role === "admin") || users[0];
      setSelectedUser(admin);
    }
  }, [embedMode, users, selectedUser, setSelectedUser]);

  // Buyers start in the bot chat when the page loads, unless a chat is already selected.
  // Only once, so closing the chat shows the welcome screen as before.
  useEffect(() => {
    if (embedMode || isAdmin || botChatOpenedRef.current || users.length === 0) return;
    botChatOpenedRef.current = true;
    if (!selectedUser && botChatUser) setSelectedUser(botChatUser);
  }, [embedMode, isAdmin, users, selectedUser, botChatUser, setSelectedUser]);

  const openMessages = useCallback(() => setIsMessagesOpen(true), []);
  const closeMessages = useCallback(() => setIsMessagesOpen(false), []);
  const clearPendingMessage = useCallback(() => setPendingMessage(null), []);

  const openBotChat = () => setSelectedUser(botChatUser);

  // Opens the bot chat, which then sends a phrase the server already treats as a support request
  const talkToSupport = () => {
    if (selectedUser?._id !== botChatUser._id) setSelectedUser(botChatUser);
    setPendingMessage(SUPPORT_REQUEST_TEXT);
  };

  // Embed mode — no sidebar, straight to chat
  if (embedMode) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-base-100">
        {selectedUser ? <ChatContainer embedMode /> : (
          <div className="flex-1 flex items-center justify-center bg-base-200">
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <p className="text-sm text-base-content/60">Connecting...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Normal mode: assistant panel (admins: contacts) | chat (| quick actions in the bot chat on xl screens), as separate cards
  return (
    <div className="h-screen bg-base-200">
      <div className="flex justify-center pt-20 px-2 sm:px-4">
        <div className="flex w-full max-w-6xl xl:max-w-7xl gap-2 sm:gap-4 h-[calc(100vh-6rem)]">
          {isAdmin ? (
            <Sidebar />
          ) : (
            <AssistantPanel
              isBotChatOpen={!!botChatUser && selectedUser?._id === botChatUser._id}
              onOpenBotChat={botChatUser ? openBotChat : undefined}
              onTalkToSupport={botChatUser ? talkToSupport : undefined}
              onOpenMessages={openMessages}
            />
          )}
          {!selectedUser ? (
            <NoChatSelected onOpenMessages={isAdmin ? undefined : openMessages} />
          ) : (
            <ChatContainer
              onOpenMessages={isAdmin ? undefined : openMessages}
              pendingMessage={pendingMessage}
              onPendingMessageSent={clearPendingMessage}
            />
          )}
        </div>
      </div>

      {/* Buyers: the contacts list (same component) opens from Messages */}
      {!isAdmin && (
        <ContactsDrawer open={isMessagesOpen} onClose={closeMessages}>
          <Sidebar inDrawer onSelectUser={closeMessages} />
        </ContactsDrawer>
      )}
    </div>
  );
};

export default HomePage;