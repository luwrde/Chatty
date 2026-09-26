import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

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

  getMessages: async (userId) => {
  set({ isMessagesLoading: true });
  try {
    const res = await axiosInstance.get(`/messages/${userId}`);
    set({ messages: res.data });
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to load messages");
  } finally {
    set({ isMessagesLoading: false });
  }
},

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      // Add user message immediately
      const messageExists = messages.some(msg => msg._id === res.data._id);
      if (!messageExists) {
        set({ messages: [...messages, res.data] });
      }
      return res.data;
    } catch (error) {
      console.error("Send message error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    const { selectedUser } = get();
    if (!socket || !selectedUser) return;

    socket.on("newMessage", (newMessage) => {
      const { messages } = get();
      const { authUser } = useAuthStore.getState();

      const isBotMessage = newMessage.isBot === true || newMessage.senderId === "bot";
      const isRegularMessage =
        (newMessage.senderId === authUser._id && newMessage.receiverId === selectedUser._id) ||
        (newMessage.senderId === selectedUser._id && newMessage.receiverId === authUser._id);

      if (isRegularMessage || isBotMessage) {
        const messageExists = messages.some(msg => msg._id === newMessage._id);
        if (!messageExists) {
          set({ messages: [...get().messages, newMessage] });
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));