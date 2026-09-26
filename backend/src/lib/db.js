import dns from "node:dns";
import mongoose from "mongoose";

// mongodb+srv:// URIs need a DNS SRV lookup. Some routers/ISPs fail it
// (querySrv ENOTFOUND / ECONNREFUSED / ETIMEOUT), so retry once with public DNS.
const PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];

const isSrvLookupError = (error) =>
    error?.syscall === "querySrv" || String(error?.message).includes("querySrv");

export const connectDB = async () => {
    try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log (`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
      const alreadyUsingPublicDns = dns.getServers().includes(PUBLIC_DNS_SERVERS[0]);
      if (isSrvLookupError(error) && !alreadyUsingPublicDns) {
        console.log(`MongoDB DNS lookup failed (${error.code}), retrying with public DNS ${PUBLIC_DNS_SERVERS.join(", ")}...`);
        dns.setServers(PUBLIC_DNS_SERVERS);
        return connectDB();
      }
      console.log("MongoDB connection error:", error);
    }
};
