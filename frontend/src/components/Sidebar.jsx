import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Bot, Users } from "lucide-react";
import { BOT_DISPLAY_NAME } from "../constants";

const isEmbedMode = () => new URLSearchParams(window.location.search).get("embed") === "1";

// inDrawer: rendered inside the Messages drawer (full list at every width); onSelectUser: called after a pick
const Sidebar = ({ inDrawer = false, onSelectUser }) => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const embedMode = isEmbedMode();

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // In embed mode, auto-select the first admin user
  useEffect(() => {
    if (embedMode && users.length > 0 && !selectedUser) {
      const admin = users.find((u) => u.role === "admin") || users[0];
      setSelectedUser(admin);
    }
  }, [embedMode, users, selectedUser, setSelectedUser]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers?.includes(user._id))
    : users;

  // Side panel: avatars only below lg. Drawer: the full list at every width.
  const layout = (drawerClasses, panelClasses) => (inDrawer ? drawerClasses : panelClasses);

  if (isUsersLoading) {
    return inDrawer ? (
      <div className="flex justify-center p-8"><span className="loading loading-spinner text-primary" /></div>
    ) : (
      <SidebarSkeleton />
    );
  }

  // In embed mode, hide sidebar completely
  if (embedMode) return null;

  return (
    <aside className={layout("h-full w-full flex flex-col overflow-hidden", "h-full w-[4.5rem] lg:w-72 shrink-0 flex flex-col overflow-hidden rounded-box border border-base-300/60 bg-base-100 shadow-soft transition-all duration-200")}>
      <div className={`border-b border-base-300/70 w-full ${layout("p-4", "p-3 lg:p-5")}`}>
        <div className={`flex items-center gap-2 ${layout("justify-start", "justify-center lg:justify-start")}`}>
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" />
          </span>
          <span className={`font-semibold ${layout("block", "hidden lg:block")}`}>Contacts</span>
        </div>
        <div className={`mt-3 items-center gap-2 ${layout("flex", "hidden lg:flex")}`}>
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-primary checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-base-content/50">({(onlineUsers?.length || 1) - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full p-2 space-y-1">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => {
              setSelectedUser(user);
              onSelectUser?.();
            }}
            className={`
              w-full p-2 flex items-center gap-3 rounded-xl
              transition-colors
              ${selectedUser?._id === user._id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-base-200"}
            `}
          >
            <div className={`relative shrink-0 ${layout("", "mx-auto lg:mx-0")}`}>
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.fullName}
                className="size-11 object-cover rounded-full"
              />
              {onlineUsers?.includes(user._id) && (
                <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-base-100" />
              )}
              {/* The admin contact is the chat the bot assistant lives in */}
              {user.role === "admin" && (
                <span
                  className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-content ring-2 ring-base-100"
                  title={`${BOT_DISPLAY_NAME} chat`}
                >
                  <Bot className="size-3" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className={`text-left min-w-0 ${layout("block", "hidden lg:block")}`}>
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-base-content/60">
                {onlineUsers?.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-base-content/50 py-4">No online users</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
