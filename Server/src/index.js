import "dotenv/config";
import http from "http";
import app from "./App.js";
import { attachRealtimeServer } from "./realtime/socket.server.js";

const httpServer = http.createServer(app);

attachRealtimeServer(httpServer);

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});