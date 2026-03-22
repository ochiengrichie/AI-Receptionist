import { WebSocketServer } from "ws";
import { handleSocketConnection } from "./socket.handlers.js";

export function attachRealtimeServer(server) {
  // The websocket server shares the same port as Express so the client only needs one backend origin.
  const wss = new WebSocketServer({
    server,
    path: "/realtime",
  });

  wss.on("connection", (socket) => {
    handleSocketConnection(socket);
  });

  return wss;
}
