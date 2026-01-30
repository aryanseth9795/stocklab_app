import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { config } from "../config";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { getAccessToken, isAuthed } = useAuth();

  // Initialize socket connection
  const initSocket = useCallback(async () => {
    const accessToken = await getAccessToken();

    const newSocket = io(config.serverUrl, {
      transports: ["websocket"],
      autoConnect: true,
      // Pass token as auth for socket.io
      auth: accessToken ? { token: accessToken } : undefined,
      // Also pass as query for compatibility
      query: accessToken ? { token: accessToken } : undefined,
      // Increased timeouts for Render.com cold starts (can take 30-60s)
      timeout: 60000, // 60 second connection timeout
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000, // Start with 2s delay
      reconnectionDelayMax: 10000, // Max 10s between retries
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setIsConnected(false);
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    setSocket(newSocket);

    return newSocket;
  }, [getAccessToken]);

  // Reconnect socket
  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    } else {
      initSocket();
    }
  }, [socket, initSocket]);

  // Initialize socket on mount and when auth changes
  useEffect(() => {
    let isMounted = true;
    let newSocket: Socket | null = null;

    const setupSocket = async () => {
      // Disconnect existing socket first
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("error");
        socket.disconnect();
      }

      if (!isMounted) return;
      newSocket = await initSocket();
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (newSocket) {
        newSocket.off("connect");
        newSocket.off("disconnect");
        newSocket.off("connect_error");
        newSocket.off("error");
        newSocket.disconnect();
      }
    };
  }, [isAuthed]); // Reinitialize when auth status changes

  const value = {
    socket,
    isConnected,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within <SocketProvider>");
  }
  return ctx;
}
