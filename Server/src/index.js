import "dotenv/config";
import http from "http";
import app from "./app.js";
import { attachRealtimeServer } from "./realtime/socket.server.js";
import { env } from "./config/env.config.js";

const server = http.createServer(app);

attachRealtimeServer(server);

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});