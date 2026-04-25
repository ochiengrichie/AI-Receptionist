import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "../../config/env.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputsDir = path.resolve(__dirname, "../../../outputs");

async function ensureOutputsDir() {
  await fs.promises.mkdir(outputsDir, { recursive: true });
}

export async function generateSpeech(text) {
  if (!text?.trim()) {
    throw new Error("text is required for generateSpeech");
  }

  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is missing");
  }

  await ensureOutputsDir();

  const fileName = `tts-${Date.now()}.mp3`;
  const outputPath = path.join(outputsDir, fileName);

  try {
    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"}`,
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      data: {
        text: text.trim(),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      responseType: "arraybuffer",
      timeout: 15000,
    });

    await fs.promises.writeFile(outputPath, response.data);

    return {
      fileName,
      outputPath,
    };
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.message ||
      "ElevenLabs TTS failed";

    throw new Error(`generateSpeech failed: ${message}`);
  }
}

export default generateSpeech;