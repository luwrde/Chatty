import { useEffect, useId, useRef, useState } from "react";
import { Archive, ArchiveRestore, Ellipsis, MessageSquare, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { formatChatDate } from "../lib/utils";

const MENU_WIDTH = 176; // w-44
const MENU_HEIGHT = 190; // room the menu needs below its button; with less it opens above
const MAX_TITLE = 80;

const hideMenu = (menu) => {
  if (menu?.matches(":popover-open")) menu.hidePopover();
};

// One of the assistant's chats in Chat history: opens it, and its ⋯ menu renames, pins, archives or deletes it.
// The menu is a popover (drawn above the page), so the panel's scrolling can't cut it off.
const ChatHistoryItem = ({ conversation, isOpen, onOpen }) => {
  const { updateConversation, deleteConversation } = useChatStore();
  const { _id, title, pinned, archived, lastMessageAt } = conversation;
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const cancelRename = useRef(false);
  const menuId = useId();

  // Below its button, right-aligned; above it when there's no room below
  const placeMenu = () => {
    const button = buttonRef.current.getBoundingClientRect();
    const viewportHeight = document.documentElement.clientHeight;
    const fitsBelow = viewportHeight - button.bottom >= MENU_HEIGHT;
    Object.assign(menuRef.current.style, {
      top: fitsBelow ? `${button.bottom + 4}px` : "auto",
      bottom: fitsBelow ? "auto" : `${viewportHeight - button.top + 4}px`,
      left: `${Math.max(8, button.right - MENU_WIDTH)}px`,
    });
  };

  // It stays where it opened, so scrolling the panel or resizing the window closes it
  useEffect(() => {
    if (!isMenuOpen) return;
    const close = () => hideMenu(menuRef.current);
    const panel = buttonRef.current?.closest("aside");
    panel?.addEventListener("scroll", close);
    window.addEventListener("resize", close);
    return () => {
      panel?.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [isMenuOpen]);

  const choose = (action) => () => {
    hideMenu(menuRef.current);
    action();
  };

  const finishRename = (value) => {
    setIsEditing(false);
    const name = value.replace(/\s+/g, " ").trim();
    if (!cancelRename.current && name && name !== title) updateConversation(_id, { title: name });
    cancelRename.current = false;
  };

  const confirmDelete = () => {
    const question = `Delete "${title}"?\n\nIt's removed from your Chat history for good. EcommerSense support can still see its messages.`;
    if (window.confirm(question)) deleteConversation(_id);
  };

  // Escape closes the menu or the rename only, not the phone's chats drawer around it
  const keepEscapeHere = (e) => {
    if (e.key === "Escape") e.stopPropagation();
  };

  const Icon = pinned ? Pin : MessageSquare;
  // The ⋯ button shows on hover or focus where there's a mouse; on touch screens it always shows
  const optionsVisibility = isOpen || isMenuOpen ? "" : "[@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";

  return (
    <li className={`group flex items-center gap-0.5 rounded-xl pr-1 transition-colors ${isOpen ? "bg-primary/10 text-primary" : "hover:bg-base-200"}`}>
      {isEditing ? (
        <input
          autoFocus
          defaultValue={title}
          maxLength={MAX_TITLE}
          aria-label="Chat name"
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            keepEscapeHere(e);
            if (e.key === "Escape") cancelRename.current = true;
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur(); // blur saves (or cancels)
          }}
          onBlur={(e) => finishRename(e.target.value)}
          className="input input-sm input-bordered my-0.5 ml-0.5 h-8 min-w-0 flex-1 rounded-lg text-sm text-base-content"
        />
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-current={isOpen ? "true" : undefined}
          title={title}
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm ${isOpen ? "font-semibold" : ""}`}
        >
          <Icon className={`size-4 shrink-0 ${isOpen ? "" : "text-base-content/50"}`} aria-hidden="true" />
          {pinned && <span className="sr-only">Pinned:</span>}
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <time dateTime={lastMessageAt} className="shrink-0 text-[11px] font-normal text-base-content/70">
            {formatChatDate(lastMessageAt)}
          </time>
        </button>
      )}

      {!isEditing && (
        <button
          ref={buttonRef}
          type="button"
          popoverTarget={menuId}
          onClick={placeMenu}
          onKeyDown={(e) => isMenuOpen && keepEscapeHere(e)}
          aria-expanded={isMenuOpen}
          aria-label={`Options for ${title}`}
          className={`grid size-7 shrink-0 place-items-center rounded-lg text-base-content/60 hover:bg-base-300/70 hover:text-base-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${optionsVisibility}`}
        >
          <Ellipsis className="size-4" aria-hidden="true" />
        </button>
      )}

      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        onToggle={(e) => setIsMenuOpen(e.newState === "open")}
        onKeyDown={keepEscapeHere}
        className="inset-auto m-0 w-44 rounded-box border border-base-300 bg-base-100 p-1.5 text-base-content shadow-lg"
      >
        <ul className="menu p-0 text-sm">
          <li>
            <button type="button" onClick={choose(() => setIsEditing(true))}>
              <Pencil className="size-4" aria-hidden="true" />
              Rename
            </button>
          </li>
          {!archived && (
            <li>
              <button type="button" onClick={choose(() => updateConversation(_id, { pinned: !pinned }))}>
                {pinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}
                {pinned ? "Unpin" : "Pin"}
              </button>
            </li>
          )}
          <li>
            <button type="button" onClick={choose(() => updateConversation(_id, { archived: !archived }))}>
              {archived ? <ArchiveRestore className="size-4" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
              {archived ? "Unarchive" : "Archive"}
            </button>
          </li>
          <li>
            <button type="button" onClick={choose(confirmDelete)} className="text-error">
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </button>
          </li>
        </ul>
      </div>
    </li>
  );
};

export default ChatHistoryItem;
