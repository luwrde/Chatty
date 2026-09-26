import { createContext, useContext, useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";

const SocketContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSocketContext = () => {
  return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
  const [botTyping, setBotTyping] = useState(false);
  const { socket, onlineUsers } = useAuthStore();

  useEffect(() => {
    if (!socket) return;

    const handleBotTyping = (isTyping) => {
      console.log("Bot typing event received:", isTyping);
      setBotTyping(isTyping);
    };

    socket.on("botTyping", handleBotTyping);

    return () => {
      socket.off("botTyping", handleBotTyping);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, botTyping }}>
      {children}
    </SocketContext.Provider>
  );
};