import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Left drawer for the contacts list (Messages). It stays mounted while closed,
// so the list still loads with the page; inert keeps it out of reach until opened.
const ContactsDrawer = ({ open, onClose, children }) => {
  const closeButtonRef = useRef(null);

  // Focus the drawer when it opens; Escape closes it
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} inert={!open}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
        className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-base-100 shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {children}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle absolute right-3 top-4"
          aria-label="Close messages"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
};

export default ContactsDrawer;
