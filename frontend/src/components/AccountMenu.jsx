import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";

// The navbar's account button: Profile, Settings and Log out in one menu
const AccountMenu = () => {
  const { authUser, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on a click outside it or on Escape
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-controls="account-menu"
        className="btn btn-sm h-10 min-h-10 gap-2 rounded-full border border-base-300 bg-base-100 pl-1 pr-3 font-semibold hover:bg-base-200"
      >
        <img src={authUser.profilePic || "/avatar.png"} alt="" className="size-8 rounded-full object-cover" />
        Account
        <ChevronDown className={`size-4 text-base-content/60 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id="account-menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <p className="truncate px-3 pb-2 pt-1 text-sm text-base-content/70">{authUser.fullName}</p>
          <ul className="menu p-0">
            <li>
              <Link to="/profile" onClick={close}>
                <User className="size-4" aria-hidden="true" />
                Profile
              </Link>
            </li>
            <li>
              <Link to="/settings" onClick={close}>
                <Settings className="size-4" aria-hidden="true" />
                Settings
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  close();
                  logout();
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Log out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
