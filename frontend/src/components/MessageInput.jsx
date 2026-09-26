import { useState } from "react";
import { Send, Image as ImageIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const MessageInput = ({ onSendMessage }) => {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const { selectedUser } = useChatStore();
  const { socket, authUser } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !image) return;

    let imageBase64 = null;
    if (image) {
      imageBase64 = await convertToBase64(image);
    }

    try {
      // Save to database
      await onSendMessage(text.trim(), imageBase64);

      // EMIT TO SOCKET FOR BOT
      if (socket && selectedUser && authUser) {
        console.log("Emitting sendMessage for bot:", text.trim());
        socket.emit("sendMessage", {
          text:      text.trim() || "📷 Sent an image",
          senderId:  authUser._id,
          receiverId: selectedUser._id,
          hasImage:  !!image,   // ← NEW: tell socket if image was sent
        });
      }

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

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-base-300">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer p-2 hover:bg-base-300 rounded-lg">
          <ImageIcon className="size-5" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </label>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 input input-bordered"
          disabled={!selectedUser}
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!selectedUser || (!text.trim() && !image)}
        >
          <Send className="size-5" />
        </button>
      </div>

      {imagePreview && (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="size-16 object-cover rounded-lg"
            />
          </div>
          <div className="flex-1">
            <span className="text-sm">Image selected: {image.name}</span>
            <button
              type="button"
              onClick={removeImage}
              className="block text-error hover:underline text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default MessageInput;