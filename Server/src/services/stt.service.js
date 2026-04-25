import axios from "axios";
import fs from "fs";
import path from "path";
import { env } from "../config/env.config.js";

export async function transcribeAudio(filePath) {
  if (!filePath) {
    throw new Error("filePath is required for transcription");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  if (!ext) {
    throw new Error("Audio file must have a valid extension");
  }

  const fileStream = fs.createReadStream(filePath);

  const response = await axios.postForm(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      file: fileStream,
      model: "whisper-1",
      response_format: "verbose_json",
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY || env.OPENAI_TTS_API_KEY}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  const data = response.data;

  return {
    transcript: data?.text || "",
    language: data?.language || "unknown",
    duration: data?.duration || 0,
    segments: data?.segments || [],
  };
}
