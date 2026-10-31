import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";
import ChatsPanel from "../components/ChatsPanel";
import ContactsDrawer from "../components/ContactsDrawer";

const isEmbedMode = () => new URLSearchParams(window.location.search).get("embed") === "1";

const HomePage = () => {
  const { selectedUser, setSelectedUser, getUsers, getConversations, users } = useChatStore();
  const { authUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const embedMode = isEmbedMode();
  // Admins keep the contacts list as their left panel (they reply to buyers from it)
  const isAdmin = authUser?.role === "admin";
  const [isChatsOpen, setIsChatsOpen] = useState(false);
  const botChatOpenedRef = useRef(false);
  // The bot chat: the support contact, the same chat embed mode opens
  const botChatUser = users.find((u) => u.isSupport) ?? users.find((u) => u.role === "admin");

  // Buyers' chat list and Chat history (and embed mode's chat list) load here; the admins' Sidebar loads its own
  useEffect(() => {
    if (embedMode || !isAdmin) {
      getUsers();
    }
    if (!embedMode && !isAdmin) getConversations();
  }, [embedMode, isAdmin, getUsers, getConversations]);

  useEffect(() => {
    if (embedMode && users.length > 0 && !selectedUser) {
      const admin = users.find((u) => u.isSupport) || users.find((u) => u.role === "admin") || users[0];
      setSelectedUser(admin);
    }
  }, [embedMode, users, selectedUser, setSelectedUser]);

  // Buyers start in the bot chat when the page loads, unless a chat is already selected.
  // Only once, so picking another chat isn't undone.
  useEffect(() => {
    if (embedMode || isAdmin || botChatOpenedRef.current || users.length === 0) return;
    botChatOpenedRef.current = true;
    if (!selectedUser && botChatUser) setSelectedUser(botChatUser);
  }, [embedMode, isAdmin, users, selectedUser, botChatUser, setSelectedUser]);

  // Handed over from another page: a question for the bot ("Ask AI" in Store, Orders, Help Center) or a chat to
  // open ("Message seller", the admin console's "Open chat"). Waits for the chat list. A question stays in the
  // navigation state until the bot chat sends it; clearing the state keeps a refresh from sending it again.
  const handoverPrompt = location.state?.prompt;
  const openUserId = location.state?.openUserId;
  const clearHandover = useCallback(
    () => navigate(location.pathname, { replace: true, state: null }),
    [navigate, location.pathname]
  );

  useEffect(() => {
    if ((!handoverPrompt && !openUserId) || users.length === 0) return;
    if (openUserId) {
      const user = users.find((u) => u._id === openUserId);
      if (user) setSelectedUser(user);
      clearHandover();
    } else if (!botChatUser) {
      clearHandover();
    } else if (selectedUser?._id !== botChatUser._id) {
      setSelectedUser(botChatUser);
    }
  }, [handoverPrompt, openUserId, users, botChatUser, selectedUser, setSelectedUser, clearHandover]);

  const pendingMessage = handoverPrompt && botChatUser && selectedUser?._id === botChatUser._id ? handoverPrompt : null;

  const openChats = useCallback(() => setIsChatsOpen(true), []);
  const closeChats = useCallback(() => setIsChatsOpen(false), []);

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

  // Chats (admins: contacts) | chat, as separate cards. Buyers on phones also have the bottom
  // tab bar, so their page is 4rem shorter (App adds the space under it).
  return (
    <div className={`bg-base-200 ${isAdmin ? "h-dvh" : "h-[calc(100dvh-4rem)] md:h-dvh"}`}>
      <div className="flex h-full justify-center px-2 pb-2 pt-[4.5rem] sm:px-4 sm:pb-4 sm:pt-20">
        <div className="flex h-full w-full max-w-6xl xl:max-w-7xl gap-2 sm:gap-4">
          {isAdmin ? <Sidebar /> : <ChatsPanel botChatUser={botChatUser} />}
          {!selectedUser ? (
            <NoChatSelected isAdmin={isAdmin} onOpenChats={isAdmin ? undefined : openChats} />
          ) : (
            <ChatContainer
              onOpenChats={isAdmin ? undefined : openChats}
              pendingMessage={pendingMessage}
              onPendingMessageSent={clearHandover}
            />
          )}
        </div>
      </div>

      {/* Buyers on phones: the chat list opens from the chat header */}
      {!isAdmin && (
        <ContactsDrawer open={isChatsOpen} onClose={closeChats}>
          <ChatsPanel botChatUser={botChatUser} inDrawer onSelectChat={closeChats} />
        </ContactsDrawer>
      )}
    </div>
  );
};

export default HomePage;
