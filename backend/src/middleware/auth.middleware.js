import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Resolves the logged-in user from the jwt cookie.
// Returns null when there is no token, the token is invalid/expired, or the user no longer exists.
const getUserFromRequest = async (req) => {
    const token = req.cookies?.jwt;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return await User.findById(decoded.userId).select("-password");
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") return null;
        throw error;
    }
};

export const protectRoute = async (req, res, next) => {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return res.status(401).json({ message: "Unauthorized - Please log in" });
        }

        // Attach user to request
        req.user = user;

        next();

    } catch (error) {
        console.log("Error in protectRoute middleware:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Like protectRoute, but lets logged-out requests through with req.user = null
export const optionalAuth = async (req, res, next) => {
    try {
        req.user = await getUserFromRequest(req);
        next();
    } catch (error) {
        console.log("Error in optionalAuth middleware:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Use after protectRoute: only admins (support and sellers) get through
export const adminOnly = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden - Admins only" });
    }
    next();
};

// Same check for socket connections: the jwt cookie sent with the handshake, or null.
// The userId in the socket query is chosen by the client, so it can't be trusted for private data.
export const getUserIdFromCookieHeader = (cookieHeader) => {
    const token = cookieHeader
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("jwt="))
        ?.slice("jwt=".length);
    if (!token) return null;

    try {
        return String(jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET).userId);
    } catch {
        return null;
    }
};
