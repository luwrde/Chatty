import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";

const isEmbedMode = () => new URLSearchParams(window.location.search).get("embed") === "1";

const HomePage = () => {
  const { selectedUser, setSelectedUser, getUsers, users } = useChatStore();
  const embedMode = isEmbedMode();

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

  // Normal mode: contacts | chat (| quick actions in the bot chat on xl screens), as separate cards
  return (
    <div className="h-screen bg-base-200">
      <div className="flex justify-center pt-20 px-2 sm:px-4">
        <div className="flex w-full max-w-6xl xl:max-w-7xl gap-2 sm:gap-4 h-[calc(100vh-6rem)]">
          <Sidebar />
          {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
        </div>
      </div>
    </div>
  );
};

export default HomePage;