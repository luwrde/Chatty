import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { useSocketContext } from "../context/SocketContext";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    sendMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const { botTyping } = useSocketContext();
  const messageEndRef = useRef(null);

  const BOT_AVATAR_URL = "https://png.pngtree.com/png-vector/20240919/ourlarge/pngtree-ai-chat-bot-image-png-image_13869131.png";

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (text, image) => {
    if (!selectedUser) return;
    await sendMessage({ text, image });
  };

  const isBotMsg = (message) => message.isBot === true || message.senderId === "bot";
  const isMyMsg = (message) => message.senderId === authUser?._id && !message.isBot;

  const renderText = (text) => {
    const urlPattern = /https?:\/\/[^\s]+/g;
    return text.split("\n").map((line, lineIndex) => {
      const tokens = [];
      let lastIndex = 0;
      let match;
      urlPattern.lastIndex = 0;
      while ((match = urlPattern.exec(line)) !== null) {
        if (match.index > lastIndex) {
          tokens.push(
            <span key={"t" + lastIndex}>{line.slice(lastIndex, match.index)}</span>
          );
        }

        const url = match[0];

        // ── Product links → open modal in parent (no page nav, no socket loss) ──
        const productMatch = url.match(/[?&]id=(\d+)/); // store links: user-home.php?id=123
        if (productMatch) {
          const productId = productMatch[1];
          tokens.push(
            <a
              key={"a" + match.index}
              href={url}
              onClick={(e) => {
                e.preventDefault();
                // Tell parent page to open the product modal directly
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ type: "OPEN_PRODUCT", productId }, "*");
                } else {
                  window.open(url, "_blank", "noopener,noreferrer");
                }
              }}
              style={{ color: "#6366f1", textDecoration: "underline", wordBreak: "break-all", cursor: "pointer" }}
            >
              {url}
            </a>
          );
        } else {
          // Regular links → open in new tab normally
          tokens.push(
            <a
              key={"a" + match.index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#6366f1", textDecoration: "underline", wordBreak: "break-all" }}
            >
              {url}
            </a>
          );
        }

        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        tokens.push(<span key={"t" + lastIndex}>{line.slice(lastIndex)}</span>);
      }
      return (
        <span key={lineIndex}>
          {tokens}
          {"\n"}
        </span>
      );
    });
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={message._id || index}
            className={`chat ${isMyMsg(message) ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    isBotMsg(message)
                      ? BOT_AVATAR_URL
                      : isMyMsg(message)
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser?.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1">
              {isBotMsg(message) ? (
                <span className="font-bold mr-1 text-gray-600">🤖 Bot</span>
              ) : isMyMsg(message) ? (
                <span className="font-bold mr-1">You</span>
              ) : (
                <span className="font-bold mr-1">{selectedUser?.fullName || "User"}</span>
              )}
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>

            <div className={`chat-bubble flex flex-col ${
              isBotMsg(message)
                ? "bg-gray-200 text-gray-800"
                : "bg-primary text-primary-content"
            }`}>
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && (
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {renderText(message.text)}
                </p>
              )}
            </div>
          </div>
        ))}

        {botTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img src={BOT_AVATAR_URL} alt="bot" />
              </div>
            </div>
            <div className="chat-header mb-1">
              <span className="font-bold mr-1 text-gray-600">🤖 Bot</span>
            </div>
            <div className="chat-bubble bg-gray-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ChatContainer;