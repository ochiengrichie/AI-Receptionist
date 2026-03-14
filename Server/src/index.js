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

app.use(cors());
app.use(express.json());

app.use("/transcribe", transcribeRoute);
app.use("/ai", aiRoute);
app.use("/tts", ttsRoute);

app.use("/audio", express.static(path.resolve(__dirname, "../outputs")));

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});