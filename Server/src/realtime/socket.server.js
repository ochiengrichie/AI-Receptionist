import { WebSocketServer } from "ws";
import { handleSocketConnection } from "./socket.handlers.js";

export function attachRealtimeServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/realtime",
  });

  wss.on("connection", (socket) => {
    handleSocketConnection(socket);
  });

  return wss;
}