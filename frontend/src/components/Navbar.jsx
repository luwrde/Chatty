import { Link, NavLink } from "react-router-dom";
import { MessageSquare, Settings } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { ADMIN_TABS, BUYER_TABS } from "../constants";
import AccountMenu from "./AccountMenu";

// One tab per module: buyers get Assistant, Store, Orders and Help Center (on phones these move
// to the bottom tab bar), admins get Chats and Console. Profile, Settings and Log out are in the account menu.
const Navbar = () => {
  const { authUser } = useAuthStore();
  const isAdmin = authUser?.role === "admin";
  const tabs = isAdmin ? ADMIN_TABS : BUYER_TABS;

  return (
    <header className="fixed top-0 z-40 w-full border-b border-base-300/70 bg-base-100/80 shadow-sm backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 transition-all hover:opacity-80">
          <div className="size-9 rounded-xl bg-primary text-primary-content flex items-center justify-center shadow-soft">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold">Chatty</span>
        </Link>

        {authUser && (
          <nav aria-label="Main" className={`items-center gap-1 ${isAdmin ? "flex" : "hidden md:flex"}`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `btn btn-sm gap-2 rounded-full border-0 ${
                      isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : "btn-ghost font-medium text-base-content/75"
                    }`
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {/* Admins' tabs show only icons on the smallest screens */}
                  <span className={isAdmin ? "sr-only sm:not-sr-only" : undefined}>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center">
          {authUser ? (
            <AccountMenu />
          ) : (
            <Link to="/settings" className="btn btn-sm btn-ghost gap-2 rounded-full">
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Settings</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
