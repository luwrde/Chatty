import { useChatStore } from "../store/useChatStore";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import BotAvatar from "./BotAvatar";
import ProductCards from "./ProductCards";
import QuickReplies from "./QuickReplies";
import ChatCard from "./ChatCards";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { useSocketContext } from "../context/SocketContext";
import { BOT_DISPLAY_NAME, FOLLOW_UP_PROMPTS, STARTER_PROMPTS, SUPPORT_REQUEST_TEXT } from "../constants";

const URL_PATTERN = /https?:\/\/[^\s]+/g;
const PRODUCT_ID_PATTERN = /[?&]id=(\d+)/; // store links: user-home.php?id=123
const STORE_PRODUCT_PAGE = /user-home\.php/i;
const BOLD_PATTERN = /\*\*(.+?)\*\*/; // split() puts the bold text at the odd indexes

// ── Product links → open modal in parent (no page nav, no socket loss) ──
// Used by the links in the message text and by the product cards
const openProductLink = (url, productId) => {
  // Tell parent page to open the product modal directly
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "OPEN_PRODUCT", productId }, "*");
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const splitBold = (line, bold) => (bold ? line.split(BOLD_PATTERN) : [line]);

// Store product links in a bot message, once per product, read the same way renderText reads them
const getStoreProductLinks = (text) => {
  const links = new Map();
  text.split("\n").forEach((line) => {
    splitBold(line, true).forEach((part) => {
      for (const [url] of part.matchAll(URL_PATTERN)) {
        const productMatch = url.match(PRODUCT_ID_PATTERN);
        if (productMatch && STORE_PRODUCT_PAGE.test(url) && !links.has(productMatch[1])) {
          links.set(productMatch[1], { url, productId: productMatch[1] });
        }
      }
    });
  });
  return [...links.values()];
};

const isBotMsg = (message) => message.isBot === true || message.senderId === "bot";

const ChatContainer = ({ embedMode = false, onOpenChats, pendingMessage, onPendingMessageSent }) => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    sendMessage,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const { botTyping } = useSocketContext();
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);

  // The bot answers only in the support contact's chat (the chat embed mode opens). Seller chats are people only.
  const isBotChat = embedMode || Boolean(selectedUser?.isSupport);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  const scrollToBottom = useCallback(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, botTyping, isMessagesLoading, scrollToBottom]);

  // Saves the message; in the bot chat it also emits the socket event the bot answers.
  // Used by the message input, the suggestions and "Talk to a person".
  const handleSendMessage = async (text, image = null) => {
    if (!selectedUser) return;
    const message = await sendMessage({ text, image });

    // EMIT TO SOCKET FOR BOT: it answers in the chat the message was saved in (not when it couldn't be sent)
    if (isBotChat && message && socket && authUser) {
      console.log("Emitting sendMessage for bot:", text);
      socket.emit("sendMessage", {
        text:      text || "📷 Sent an image",
        senderId:  authUser._id,
        receiverId: selectedUser._id,
        hasImage:  !!image,   // ← NEW: tell socket if image was sent
        conversationId: message.conversationId,
      });
    }
  };

  const sendPresetMessage = (text) => {
    handleSendMessage(text).catch((error) => console.error("Failed to send message:", error));
  };

  // Sends a phrase the server already treats as a support request
  const talkToSupport = () => sendPresetMessage(SUPPORT_REQUEST_TEXT);

  // A message queued outside the chat ("Ask AI" on another page) is sent the same way,
  // once this chat's own messages have loaded, so it can't mix with the chat that was open before
  const sendPendingMessage = useEffectEvent((text) => {
    onPendingMessageSent?.();
    if (isBotChat) sendPresetMessage(text);
  });

  useEffect(() => {
    // Fresh store read: the effect above may have just started loading a newly selected chat
    if (pendingMessage && !useChatStore.getState().isMessagesLoading) sendPendingMessage(pendingMessage);
  }, [pendingMessage, isMessagesLoading]);

  const isMyMsg = (message) => message.senderId === authUser?._id && !message.isBot;

  // First visit: a greeting with starter suggestions. Later: one suggestion row that follows the last bot card.
  const showWelcome = isBotChat && !isMessagesLoading && messages.length === 0;
  const lastBotMessage = [...messages].reverse().find(isBotMsg);
  const followUps = FOLLOW_UP_PROMPTS[lastBotMessage?.card?.type] ?? FOLLOW_UP_PROMPTS.default;

  const renderLinks = (text, keyPrefix, linkClassName) => {
    const tokens = [];
    let lastIndex = 0;
    for (const match of text.matchAll(URL_PATTERN)) {
      if (match.index > lastIndex) {
        tokens.push(
          <span key={keyPrefix + "t" + lastIndex}>{text.slice(lastIndex, match.index)}</span>
        );
      }

      const url = match[0];

      const productMatch = url.match(PRODUCT_ID_PATTERN);
      if (productMatch) {
        const productId = productMatch[1];
        tokens.push(
          <a
            key={keyPrefix + "a" + match.index}
            href={url}
            onClick={(e) => {
              e.preventDefault();
              openProductLink(url, productId);
            }}
            className={`${linkClassName} cursor-pointer`}
          >
            {url}
          </a>
        );
      } else {
        // Regular links → open in new tab normally
        tokens.push(
          <a
            key={keyPrefix + "a" + match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {url}
          </a>
        );
      }

      lastIndex = match.index + url.length;
    }
    if (lastIndex < text.length) {
      tokens.push(<span key={keyPrefix + "t" + lastIndex}>{text.slice(lastIndex)}</span>);
    }
    return tokens;
  };

  // Plain text with clickable links; bot text also gets **bold** (as React elements, never raw HTML)
  const renderText = (text, { bold, linkClassName }) => {
    const lines = text.split("\n");
    return lines.map((line, lineIndex) => (
      <span key={lineIndex}>
        {splitBold(line, bold).map((part, partIndex) => {
          const tokens = renderLinks(part, `${partIndex}-`, linkClassName);
          return partIndex % 2 === 1 ? (
            <strong key={partIndex} className="font-semibold">{tokens}</strong>
          ) : (
            <span key={partIndex}>{tokens}</span>
          );
        })}
        {lineIndex < lines.length - 1 && "\n"}
      </span>
    ));
  };

  const chatColumnClassName = embedMode
    ? "flex-1 min-h-0 flex flex-col bg-base-100"
    : "flex-1 min-w-0 flex flex-col overflow-hidden rounded-box border border-base-300/60 bg-base-100 shadow-soft";

  return (
    <div className={chatColumnClassName}>
      <ChatHeader
        isBotChat={isBotChat}
        onOpenChats={onOpenChats}
        onTalkToSupport={isBotChat ? talkToSupport : undefined}
      />

      {isMessagesLoading ? (
        <MessageSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-5 space-y-4">
          {isBotChat && (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-base-content/70">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
              Messages are saved and can be read by EcommerSense support.
            </p>
          )}

          {showWelcome && (
            <div className="mx-auto flex max-w-md flex-col items-center px-2 py-6 text-center">
              <BotAvatar className="size-16 bg-primary/10 text-primary ring-8 ring-primary/5" iconClassName="size-8" />
              <h2 className="mt-5 text-xl font-bold">Hi, I&apos;m {BOT_DISPLAY_NAME}</h2>
              <p className="mt-1 text-sm text-base-content/70">Ask about products, prices, your orders, or anything else.</p>
              <div className="mt-6 grid w-full grid-cols-2 gap-2">
                {STARTER_PROMPTS.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.text}
                      type="button"
                      onClick={() => sendPresetMessage(prompt.text)}
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3 text-left text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      {prompt.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const isBot = isBotMsg(message);
            const isMine = isMyMsg(message);
            const productLinks = isBot && message.text ? getStoreProductLinks(message.text) : [];

            return (
              <div
                key={message._id || index}
                className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : ""}`}
              >
                {isBot ? (
                  <BotAvatar />
                ) : (
                  <img
                    src={
                      isMine
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser?.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                    className="size-8 shrink-0 rounded-full object-cover ring-1 ring-base-300"
                  />
                )}

                <div className={`flex min-w-0 flex-1 flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div
                    className={`flex max-w-[85%] sm:max-w-[75%] flex-col rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      isMine
                        ? "rounded-tr-md bg-primary text-primary-content"
                        : "rounded-tl-md bg-base-200 text-base-content"
                    }`}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        className={`sm:max-w-[200px] rounded-xl ${message.text ? "mb-2" : ""}`}
                      />
                    )}
                    {message.text && (
                      <p className="whitespace-pre-wrap break-words">
                        {renderText(message.text, {
                          bold: isBot,
                          linkClassName: `underline underline-offset-2 break-all ${isMine ? "text-primary-content" : "text-primary"}`,
                        })}
                      </p>
                    )}
                  </div>

                  {isBot && message.card && <ChatCard card={message.card} embedMode={embedMode} />}

                  {productLinks.length > 0 && (
                    <ProductCards
                      links={productLinks}
                      onView={openProductLink}
                      onMoreOptions={(name) => sendPresetMessage(`Show me other options similar to ${name}`)}
                      onLoad={scrollToBottom}
                    />
                  )}

                  <div className="mt-1 px-1 text-[11px] text-base-content/70">
                    {!isMine && (
                      <span className="font-medium">
                        {isBot ? BOT_DISPLAY_NAME : selectedUser?.fullName || "User"} ·{" "}
                      </span>
                    )}
                    <time>{formatMessageTime(message.createdAt)}</time>
                  </div>
                </div>
              </div>
            );
          })}

          {botTyping && (
            <div className="flex items-start gap-2">
              <BotAvatar />
              <div className="rounded-2xl rounded-tl-md bg-base-200 px-4 py-3 shadow-sm" aria-label={`${BOT_DISPLAY_NAME} is typing`}>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                  <div className="w-2 h-2 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>
      )}

      {isBotChat && !showWelcome && !isMessagesLoading && (
        <QuickReplies suggestions={followUps} onSelect={sendPresetMessage} embedMode={embedMode} />
      )}
      <MessageInput
        onSendMessage={handleSendMessage}
        inputRef={inputRef}
        placeholder={isBotChat ? "Ask about products, orders or anything else" : "Type a message..."}
      />
    </div>
  );
};

export default ChatContainer;
