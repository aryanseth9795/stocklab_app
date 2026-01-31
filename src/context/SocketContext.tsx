import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
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
  const socketRef = useRef<Socket | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Initialize socket connection
  const initSocket = useCallback(async () => {
    // Clean up existing socket first
    if (socketRef.current) {
      socketRef.current.off("connect");
      socketRef.current.off("disconnect");
      socketRef.current.off("connect_error");
      socketRef.current.off("error");
      socketRef.current.disconnect();
    }

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
      reconnectionAttempts: Infinity, // Keep trying
      reconnectionDelay: 1000, // Start with 1s delay
      reconnectionDelayMax: 5000, // Max 5s between retries
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

    socketRef.current = newSocket;
    setSocket(newSocket);

    return newSocket;
  }, [getAccessToken]);

  // Reconnect socket - ensures fresh connection with latest token
  const reconnect = useCallback(async () => {
    console.log("Reconnecting socket...");
    await initSocket();
  }, [initSocket]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // When app comes back from background to active
      if (
        (previousState === "background" || previousState === "inactive") &&
        nextAppState === "active"
      ) {
        console.log(
          "App returned to foreground, checking socket connection...",
        );

        // Check if socket is connected, if not reconnect
        if (socketRef.current && !socketRef.current.connected) {
          console.log(
            "Socket disconnected while in background, reconnecting...",
          );
          await reconnect();
        } else if (!socketRef.current) {
          console.log("No socket found, initializing...");
          await initSocket();
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [reconnect, initSocket]);

  // Initialize socket on mount and when auth changes
  useEffect(() => {
    let isMounted = true;

    const setupSocket = async () => {
      if (!isMounted) return;
      await initSocket();
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("error");
        socketRef.current.disconnect();
        socketRef.current = null;
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
