import { NavLink } from "react-router-dom";
import { BUYER_TABS } from "../constants";

// Buyers on phones: the modules as a bottom tab bar (from md up they're in the navbar)
const MobileTabBar = () => {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-base-300/70 bg-base-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      {BUYER_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] ${
                isActive ? "font-bold text-primary" : "font-medium text-base-content/75"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-7 w-12 place-items-center rounded-full ${isActive ? "bg-primary/10" : ""}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {tab.shortLabel ?? tab.label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
