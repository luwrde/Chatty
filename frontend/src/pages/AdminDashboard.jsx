import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// Socket.io lives on the backend, not the Vite dev server
const SOCKET_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

const AdminDashboard = () => {
  const socketRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      query: { userId: "admin", isAdmin: "true" }
    });

    newSocket.on("connect", () => {
      console.log("Admin connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => setIsConnected(false));

    newSocket.on("pending_support_requests", (pendingRequests) => {
      setRequests(pendingRequests);
    });

    newSocket.on("new_support_request", (request) => {
      setRequests(prev => [...prev, request]);
    });

    socketRef.current = newSocket;

    return () => newSocket.close();
  }, []);

  const resolveRequest = (requestId) => {
    socketRef.current?.emit("resolve_support", { requestId });
    setRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const sendReply = (userId, requestId) => {
    const message = replyText[userId];
    if (message && message.trim()) {
      socketRef.current?.emit("admin_reply", { userId, message });
      setReplyText(prev => ({ ...prev, [userId]: "" }));
      setRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Support Requests ({requests.length})
          </h2>
          
          {requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📭</div>
              <p>No pending support requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(req => (
                <div key={req.id} className="border rounded-lg p-4 bg-yellow-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-lg">User ID:</span>
                      <span className="ml-2 text-gray-700">{req.userId}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(req.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="bg-white rounded p-3 mb-3">
                    <p className="text-gray-700">"{req.message}"</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your reply..."
                      className="flex-1 input input-bordered input-sm"
                      value={replyText[req.userId] || ""}
                      onChange={(e) => setReplyText(prev => ({ ...prev, [req.userId]: e.target.value }))}
                    />
                    <button 
                      onClick={() => sendReply(req.userId, req.id)}
                      className="btn btn-primary btn-sm"
                    >
                      Send Reply
                    </button>
                    <button 
                      onClick={() => resolveRequest(req.id)}
                      className="btn btn-success btn-sm"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;