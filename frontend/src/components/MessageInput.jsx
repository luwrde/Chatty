import { useEffect, useRef, useState } from "react";
import { Send, Image as ImageIcon, Smile } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

// Small built-in emoji list (no picker package)
const EMOJIS = [
  "😀", "😂", "😊", "😍", "🥰", "😎",
  "🤔", "😅", "😢", "😮", "👍", "👎",
  "👏", "🙏", "🙌", "💯", "🔥", "🎉",
  "❤️", "💜", "✅", "🛍️", "📦", "🚚",
];

const MessageInput = ({ onSendMessage, inputRef, placeholder = "Type a message..." }) => {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const emojiMenuRef = useRef(null);
  const { selectedUser } = useChatStore();

  // Close the emoji list on a click outside it or on Escape
  useEffect(() => {
    if (!showEmojis) return;
    const handleMouseDown = (e) => {
      if (!emojiMenuRef.current?.contains(e.target)) setShowEmojis(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setShowEmojis(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEmojis]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !image) return;

    let imageBase64 = null;
    if (image) {
      imageBase64 = await convertToBase64(image);
    }

    try {
      // Save to database; onSendMessage also emits the socket event for the bot
      await onSendMessage(text.trim(), imageBase64);

      setText("");
      setImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload  = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  // Inserts the emoji where the cursor is, then puts the cursor right after it
  const insertEmoji = (emoji) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    setShowEmojis(false);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
      {imagePreview && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-base-300 bg-base-200/60 p-2">
          <img
            src={imagePreview}
            alt="Preview"
            className="size-12 shrink-0 object-cover rounded-lg"
          />
          <span className="min-w-0 flex-1 truncate text-sm">Image selected: {image.name}</span>
          <button
            type="button"
            onClick={removeImage}
            className="btn btn-ghost btn-xs shrink-0 text-error"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 rounded-full border border-base-300 bg-base-100 py-1.5 pl-1.5 pr-1.5 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
        <label
          className="btn btn-ghost btn-sm btn-circle shrink-0 text-base-content/60 hover:text-primary focus-within:ring-2 focus-within:ring-primary/30"
          title="Attach an image"
        >
          <ImageIcon className="size-5" aria-hidden="true" />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Attach an image"
            onChange={handleImageChange}
          />
        </label>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Message"
          className="min-w-0 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-base-content/60"
          disabled={!selectedUser}
        />

        <div ref={emojiMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowEmojis((open) => !open)}
            className="btn btn-ghost btn-sm btn-circle text-base-content/60 hover:text-primary"
            aria-label="Insert emoji"
            aria-expanded={showEmojis}
            title="Insert emoji"
          >
            <Smile className="size-5" />
          </button>
          {showEmojis && (
            <div className="absolute bottom-full right-0 z-20 mb-2 grid w-max grid-cols-6 gap-1 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="grid size-8 place-items-center rounded-lg text-lg hover:bg-base-200"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-sm btn-circle shrink-0"
          disabled={!selectedUser || (!text.trim() && !image)}
          aria-label="Send message"
        >
          <Send className="size-4" />
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
