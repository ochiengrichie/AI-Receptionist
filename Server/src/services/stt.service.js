import axios from "axios";
import fs from "fs";
import FormData from "form-data";
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

  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));

  const response = await axios.post(
    "https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2",
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  const result = response.data?.results?.channels?.[0]?.alternatives?.[0];

  return {
    transcript: result?.transcript || "",
    language: response.data?.results?.channels?.[0]?.detected_language || "unknown",
    duration: response.data?.metadata?.duration || 0,
    segments: result?.words || [],
  };
}
