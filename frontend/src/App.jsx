import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Loader } from "lucide-react";

import Navbar         from "./components/Navbar";
import EmbedAuth      from "./components/EmbedAuth";
import HomePage       from "./pages/HomePage";
import SignUpPage     from "./pages/SignUpPage";
import LoginPage      from "./pages/LoginPage";
import ProfilePage    from "./pages/ProfilePage";
import SettingsPage   from "./pages/SettingsPage";
import AdminDashboard from "./pages/AdminDashboard";

import { useAuthStore }  from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useChatStore }  from "./store/useChatStore";

const isEmbedMode = () => new URLSearchParams(window.location.search).get("embed") === "1";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme }    = useThemeStore();
  const { messages } = useChatStore();
  const [embedReady, setEmbedReady] = useState(false);
  const handleEmbedReady = useCallback(() => setEmbedReady(true), []);
  const embedMode = isEmbedMode();

  useEffect(() => { if (!embedMode) checkAuth(); }, [checkAuth, embedMode]);

  useEffect(() => {
    if (!embedMode || !window.parent || window.parent === window) return;
    const unread = messages.filter((m) => (m.isBot || m.senderId === "admin") && !m._read).length;
    window.parent.postMessage({ type: "UNREAD_COUNT", count: unread }, "*");
  }, [messages, embedMode]);

  if (embedMode) {
    if (!embedReady) return (<><EmbedAuth onReady={handleEmbedReady} /><Toaster /></>);
    return (<div data-theme={theme} className="h-screen"><HomePage embedMode /><Toaster /></div>);
  }

  if (isCheckingAuth && !authUser) return (
    <div className="flex items-center justify-center h-screen">
      <Loader className="size-10 animate-spin" />
    </div>
  );

  return (
    <div data-theme={theme}>
      <Navbar />
      <Routes>
        <Route path="/"         element={authUser ? <HomePage />     : <Navigate to="/login" />} />
        <Route path="/signup"   element={!authUser ? <SignUpPage />  : <Navigate to="/" />} />
        <Route path="/login"    element={!authUser ? <LoginPage />   : <Navigate to="/" />} />
        <Route path="/profile"  element={authUser ? <ProfilePage />  : <Navigate to="/login" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin"    element={authUser?.role === "admin" ? <AdminDashboard /> : <Navigate to="/" />} />
      </Routes>
      <Toaster />
    </div>
  );
};

export default App;