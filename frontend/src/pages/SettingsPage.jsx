import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { Send, Trash2, AlertTriangle, X } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ UPDATED: Backend URL fixed to port 5001
  const deleteAccount = async () => {
    try {
      setIsDeleting(true);
      
      // Get authentication token from localStorage
      // Check your auth setup - you might store token differently
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('auth_token') ||
                   localStorage.getItem('access_token') ||
                   sessionStorage.getItem('token') ||
                   '';
      
      // ✅ BACKEND URL FIXED: Port 5001
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                         import.meta.env.REACT_APP_API_URL?.replace('/api', '') || 
                         'http://localhost:5001'; // ← PORT 5001
      
      console.log('🔄 Deleting account...');
      console.log('Backend URL:', BACKEND_URL);
      console.log('Has token:', !!token);
      
      const response = await fetch(`${BACKEND_URL}/api/user/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('✅ Response status:', response.status);
      console.log('✅ Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Handle 204 No Content (common for DELETE)
      if (response.status === 204) {
        console.log('✅ Account deleted (204 No Content)');
        return { success: true, message: "Account deleted successfully" };
      }
      
      // Handle 200 OK with JSON response
      if (response.status === 200) {
        try {
          const data = await response.json();
          console.log('✅ Account deleted with response:', data);
          return data;
        } catch {
          return { success: true };
        }
      }
      
      // Handle 401 Unauthorized (token invalid/expired)
      if (response.status === 401) {
        console.error('❌ Unauthorized - Token may be invalid or expired');
        throw new Error('Your session has expired. Please log in again.');
      }
      
      // Handle 404 Not Found (endpoint doesn't exist)
      if (response.status === 404) {
        console.error('❌ Endpoint not found');
        throw new Error('Delete endpoint not found. Check backend routes.');
      }
      
      // Handle other errors
      if (!response.ok) {
        let errorMessage = `Failed to delete account (${response.status})`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('❌ Server error response:', errorData);
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Default success
      return { success: true };
      
    } catch (error) {
      console.error('❌ Network/API error:', error);
      
      // Handle specific network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please check if your backend is running on port 5001.');
      }
      
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    console.log("🗑️ Delete button clicked");
    try {
      console.log("🔄 Calling deleteAccount...");
      const result = await deleteAccount();
      console.log("✅ deleteAccount succeeded:", result);
      
      toast.success("Account deleted successfully");
      setShowDeleteModal(false);
      
      // Clear all user data from storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login page after deletion
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
      
    } catch (error) {
      console.error("❌ Delete account error:", error);
      toast.error(error.message || "Failed to delete account. Please try again.");
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Temporary debug button - remove after testing
  const debugBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/user/delete', {
        method: 'OPTIONS', // Preflight request
      });
      console.log('Backend OPTIONS response:', response);
      toast.success(`Backend is reachable on port 5001`);
    } catch (error) {
      console.error('Backend connection test failed:', error);
      toast.error(`Cannot connect to backend on port 5001: ${error.message}`);
    }
  };

  return (
    <div className="h-screen container mx-auto px-4 pt-20 max-w-5xl">
      {/* Temporary debug button - remove this after testing */}
      <button 
        onClick={debugBackendConnection}
        className="fixed bottom-4 right-4 btn btn-sm btn-info z-50"
        style={{ display: 'none' }} // Hidden by default, change to 'block' to test
      >
        Test Backend Connection
      </button>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-error/10 rounded-lg">
                  <AlertTriangle className="size-6 text-error" />
                </div>
                <h3 className="text-xl font-bold text-error">Delete Account</h3>
              </div>
              <button
                onClick={handleCancelDelete}
                className="btn btn-ghost btn-sm btn-circle"
                disabled={isDeleting}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-base-content/80">
                Are you sure you want to delete your account? This action <span className="font-semibold text-error">cannot be undone</span>.
              </p>
              
              <div className="bg-error/5 border border-error/20 rounded-lg p-4">
                <h4 className="font-semibold text-error mb-2">What will be deleted:</h4>
                <ul className="text-sm space-y-1 text-base-content/70">
                  <li>• Your profile information</li>
                  <li>• All your messages</li>
                  <li>• Chat history with all users</li>
                  <li>• Account credentials</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancelDelete}
                  className="btn btn-ghost flex-1"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="btn btn-error flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Deleting...
                    </>
                  ) : (
                    "Yes, Delete My Account"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Chatty</h1>
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
            >
              <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Preview Section */}
        <div className="space-y-6 pt-8 border-t border-base-300">
          <h3 className="text-lg font-semibold mb-3">Preview</h3>
          <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
            <div className="p-4 bg-base-200">
              <div className="max-w-lg mx-auto">
                {/* Mock Chat UI */}
                <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                  {/* Chat Header */}
                  <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                        J
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">John Doe</h3>
                        <p className="text-xs text-base-content/70">Online</p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                    {PREVIEW_MESSAGES.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`
                            max-w-[80%] rounded-xl p-3 shadow-sm
                            ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                          `}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`
                              text-[10px] mt-1.5
                              ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                            `}
                          >
                            12:00 PM
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-base-300 bg-base-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input input-bordered flex-1 text-sm h-10"
                        placeholder="Type a message..."
                        value="This is a preview"
                        readOnly
                      />
                      <button className="btn btn-primary h-10 min-h-0">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="pt-8 border-t border-base-300">
          <div className="flex flex-col gap-1 mb-4">
            <h2 className="text-lg font-semibold text-error">Danger Zone</h2>
            <p className="text-sm text-base-content/70">
              Permanently delete your account and all data
            </p>
          </div>
          
          <button
            onClick={handleDeleteClick}
            className="btn btn-error btn-outline w-full flex items-center justify-center gap-2"
          >
            <Trash2 className="size-5" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;