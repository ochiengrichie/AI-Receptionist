import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

import transcribeRoute from "./routes/transcribe.route.js";
import aiRoute from "./routes/ai.route.js";
import ttsRoute from "./routes/tts.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use("/transcribe", transcribeRoute);
app.use("/ai", aiRoute);
app.use("/tts", ttsRoute);

// Serves generated speech files like /audio/tts-123.mp3
app.use("/audio", express.static(path.resolve(__dirname, "../outputs")));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default app;