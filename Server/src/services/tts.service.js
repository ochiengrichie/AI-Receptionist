import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { env } from "../config/env.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputsDir = path.resolve(__dirname, "../../outputs");

async function ensureOutputsDir() {
  await fs.mkdir(outputsDir, { recursive: true });
}

export async function generateSpeech(text) {
  const trimmedText = text?.trim();

  if (!trimmedText) {
    throw new Error("Text is required for TTS generation");
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  await ensureOutputsDir();

  const fileName = `tts-${Date.now()}.mp3`;
  const outputPath = path.join(outputsDir, fileName);

  const response = await axios.post(
    "https://api.openai.com/v1/audio/speech",
    {
      model: env.OPENAI_TTS_MODEL,
      voice: env.OPENAI_TTS_VOICE,
      input: trimmedText,
      format: "mp3",
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
    }
  );

  await fs.writeFile(outputPath, Buffer.from(response.data));

  return {
    fileName,
    outputPath,
  };
}

export default generateSpeech;
