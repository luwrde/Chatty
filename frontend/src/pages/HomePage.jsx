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
      <div className="h-screen flex flex-col overflow-hidden">
        {selectedUser ? <ChatContainer /> : (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-md"></span>
              <p className="text-sm text-base-content/60">Connecting...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Normal mode
  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;