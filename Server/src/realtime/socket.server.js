import { WebSocketServer } from "ws";
import { handleSocketConnection } from "./socket.handlers.js";
import { EVENTS } from "../constants/events.constants.js";

export function attachRealtimeServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/realtime",
  });

  wss.on("connection", (socket, request) => {
    console.log(`New WebSocket connection from ${request.socket.remoteAddress}`);

    // attach basic metadata (useful later)
    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    handleSocketConnection(socket);
  });

  //HEARTBEAT (prevents dead connections)
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        return socket.terminate();
      }

      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  return wss;
}