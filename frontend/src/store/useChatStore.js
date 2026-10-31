import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// The assistant's chat is the support contact's (the server marks it isSupport). It's kept as separate chats,
// the user's Chat history; any other chat is one conversation with that person.
const isAssistant = (user) => Boolean(user?.isSupport);
const isBotMessage = (message) => message.isBot === true || message.senderId === "bot";

// Opening the assistant continues its latest chat if that chat was active this recently; otherwise it starts a new one
const RESUME_CHAT_MS = 60 * 60 * 1000;

const pickChatToResume = (conversations) => {
  const latest = conversations.find((conversation) => !conversation.archived);
  return latest && Date.now() - new Date(latest.lastMessageAt).getTime() < RESUME_CHAT_MS ? latest._id : null;
};

// When a chat leaves Chat history (archived, deleted) while it's open, the chat window moves on to a new chat
const leaveIfOpen = (get, conversationId) => {
  const { selectedUser, activeConversationId } = get();
  if (isAssistant(selectedUser) && activeConversationId === conversationId) get().startNewConversation(selectedUser);
};

// Whether a message belongs to the chat on screen
const isForOpenChat = (message, { selectedUser, activeConversationId }, myId) => {
  if (!selectedUser) return false;
  if (isAssistant(selectedUser) && (message.conversationId || isBotMessage(message))) {
    // Only the open one of the assistant's chats (a bot reply that couldn't be saved has no chat)
    return !message.conversationId || message.conversationId === activeConversationId;
  }
  return (
    (message.senderId === myId && message.receiverId === selectedUser._id) ||
    (message.senderId === selectedUser._id && message.receiverId === myId)
  );
};

// Whether a message is in one of my own assistant chats (support also gets the buyers' ones, from the other side)
const isInMyAssistantChat = (message, assistantId) =>
  Boolean(message.conversationId && assistantId) &&
  (message.senderId === assistantId || message.receiverId === assistantId || message.senderId === "bot");

let historyRequest = null; // the Chat history request in flight, shared by everyone asking at once
let messagesLoad = 0; // counts loads of the open chat; only the latest one is shown

const initialState = {
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  // Chat history: the user's chats with the assistant, the most recent first
  conversations: [],
  conversationsLoaded: false,
  // The assistant chat that's open: its id, null for a new chat (saved with its first message),
  // undefined until the assistant is first opened (it then picks one)
  activeConversationId: undefined,
};

export const useChatStore = create((set, get) => ({
  ...initialState,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Chat history. Resolves with the list (the one already loaded if the request fails).
  getConversations: () => {
    if (historyRequest) return historyRequest;
    const userId = useAuthStore.getState().authUser?._id;
    const request = axiosInstance
      .get("/conversations")
      .then((res) => res.data)
      .catch((error) => {
        toast.error(error.response?.data?.message || "Failed to load chat history");
        return get().conversations;
      })
      .then((conversations) => {
        if (historyRequest === request) historyRequest = null;
        // Signed out (or in as someone else) meanwhile: not this account's list
        if (useAuthStore.getState().authUser?._id !== userId) return [];
        set({ conversations, conversationsLoaded: true });
        return conversations;
      });
    historyRequest = request;
    return request;
  },

  // Loads the open chat: the person's messages, or the open assistant chat's
  getMessages: async (userId) => {
    const load = ++messagesLoad;
    const isLatest = () => load === messagesLoad;
    // Cleared first, so whatever arrives over the socket while loading belongs to this chat (kept below)
    set({ isMessagesLoading: true, messages: [] });
    try {
      let url = `/messages/${userId}`;
      if (isAssistant(get().selectedUser)) {
        if (get().activeConversationId === undefined) {
          const resumed = pickChatToResume(await get().getConversations());
          if (!isLatest()) return;
          // Unless the first message of a new chat already picked one meanwhile
          if (get().activeConversationId === undefined) set({ activeConversationId: resumed });
        }
        const conversationId = get().activeConversationId;
        if (!conversationId) return; // a new chat: nothing saved yet
        url = `/conversations/${conversationId}/messages`;
      }
      const res = await axiosInstance.get(url);
      if (!isLatest()) return;
      const loadedIds = new Set(res.data.map((message) => message._id));
      set({ messages: [...res.data, ...get().messages.filter((message) => !loadedIds.has(message._id))] });
    } catch (error) {
      if (isLatest()) toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      if (isLatest()) set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, activeConversationId } = get();
    // In the assistant's chat the message goes into the open chat; without one it starts a new chat
    const toAssistant = isAssistant(selectedUser);
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        toAssistant ? { ...messageData, conversationId: activeConversationId ?? null } : messageData
      );
      const message = res.data;
      if (toAssistant) {
        // A new chat now has its id (if it's still the chat that's open)
        if (!activeConversationId && get().activeConversationId === activeConversationId && isAssistant(get().selectedUser)) {
          set({ activeConversationId: message.conversationId });
        }
        get().noteChatActivity(message);
      }
      // Add user message immediately, if its chat is still on screen
      const { messages } = get();
      if (isForOpenChat(message, get(), useAuthStore.getState().authUser?._id) && !messages.some((msg) => msg._id === message._id)) {
        set({ messages: [...messages, message] });
      }
      return message;
    } catch (error) {
      console.error("Send message error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Keeps Chat history in order as messages come in: their chat moves up (and out of Archived, as on the server);
  // one that isn't listed yet is fetched
  noteChatActivity: (message) => {
    const { conversations } = get();
    if (!conversations.some((conversation) => conversation._id === message.conversationId)) {
      get().getConversations();
      return;
    }
    set({
      conversations: conversations
        .map((conversation) =>
          conversation._id === message.conversationId
            ? {
                ...conversation,
                archived: false,
                lastMessageAt:
                  new Date(message.createdAt) > new Date(conversation.lastMessageAt) ? message.createdAt : conversation.lastMessageAt,
              }
            : conversation
        )
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)),
    });
  },

  // Renames, pins or archives one of the user's assistant chats. changes: { title?, pinned?, archived? }
  updateConversation: async (conversationId, changes) => {
    try {
      const res = await axiosInstance.patch(`/conversations/${conversationId}`, changes);
      set({
        conversations: get().conversations.map((conversation) =>
          conversation._id === conversationId ? { ...conversation, ...res.data } : conversation
        ),
      });
      if (changes.archived) {
        leaveIfOpen(get, conversationId);
        toast.success("Chat archived");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't update the chat");
    }
  },

  // Removes one of the user's assistant chats from their Chat history for good (support keeps its copy)
  deleteConversation: async (conversationId) => {
    try {
      await axiosInstance.delete(`/conversations/${conversationId}`);
      set({ conversations: get().conversations.filter((conversation) => conversation._id !== conversationId) });
      leaveIfOpen(get, conversationId);
      toast.success("Chat deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't delete the chat");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Reads the store when a message arrives, so it follows chat switches without subscribing again
    socket.on("newMessage", (newMessage) => {
      const state = get();
      if (isInMyAssistantChat(newMessage, state.users.find(isAssistant)?._id)) state.noteChatActivity(newMessage);

      const isOpen = isForOpenChat(newMessage, state, useAuthStore.getState().authUser?._id);
      if (isOpen && !state.messages.some((msg) => msg._id === newMessage._id)) {
        set({ messages: [...state.messages, newMessage] });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  // Opens one of the assistant's chats from Chat history (assistant: the assistant's chat in the chat list)
  openConversation: (assistant, conversationId) => {
    const { selectedUser, activeConversationId } = get();
    const isAssistantOpen = selectedUser?._id === assistant._id;
    if (isAssistantOpen && activeConversationId === conversationId) return;
    set({ selectedUser: assistant, activeConversationId: conversationId });
    // From another chat, the chat window loads it as it switches over
    if (isAssistantOpen) get().getMessages(assistant._id);
  },

  // A new chat with the assistant. It's saved, and listed in Chat history, with its first message.
  startNewConversation: (assistant) => {
    messagesLoad++; // a chat still loading isn't the one open anymore
    set({ selectedUser: assistant, activeConversationId: null, messages: [], isMessagesLoading: false });
  },
}));

// Signing out, or in as someone else: nothing of the last account's chats stays
useAuthStore.subscribe((state, previous) => {
  if (state.authUser?._id === previous.authUser?._id) return;
  historyRequest = null;
  messagesLoad++;
  useChatStore.setState(initialState);
});
