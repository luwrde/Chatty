import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "../store/useAuthStore.js";

const getEmbedParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    uid:   params.get("uid"),
    name:  params.get("name"),
    email: params.get("email"),
    role:  params.get("role"),
  };
};

const EmbedAuth = ({ onReady }) => {
  const [status, setStatus] = useState(() => {
    const { uid, email } = getEmbedParams();
    return uid && email ? "authenticating" : "error";
  });
  const { setAuthUser, connectSocket } = useAuthStore();

  useEffect(() => {
    const { uid, name, email, role } = getEmbedParams();
    if (!uid || !email) return;

    let cancelled = false;
    const authenticate = async () => {
      try {
        const res = await axiosInstance.post("/embed/token", { uid, name, email, role });
        if (cancelled) return;
        setAuthUser(res.data);
        connectSocket();
        setStatus("done");
        onReady?.();
      } catch (err) {
        if (cancelled) return;
        console.error("EmbedAuth failed:", err.message);
        setStatus("error");
      }
    };
    authenticate();
    return () => { cancelled = true; };
  }, [onReady, setAuthUser, connectSocket]);

  if (status === "authenticating") return (
    <div className="h-screen flex flex-col items-center justify-center bg-base-200 gap-3">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="text-sm text-base-content/60">Connecting to chat…</p>
    </div>
  );

  if (status === "error") return (
    <div className="h-screen flex items-center justify-center bg-base-200">
      <p className="text-sm text-error">Could not connect. Please refresh or contact support.</p>
    </div>
  );

  return null;
};

export default EmbedAuth;