import { transcribeAudio } from "../services/stt.service.js";
import { deleteFile } from "../utils/deleteFile.js";

export async function handleTranscription(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    console.log("[TRANSCRIBE] incoming file:", req.file.path);

    const result = await transcribeAudio(req.file.path);

    console.log("[TRANSCRIBE] result:", result);

    await deleteFile(req.file.path);

    return res.status(200).json({
      message: "Transcription successful",
      transcript: result.transcript,
      language: result.language,
      duration: result.duration,
      segments: result.segments,
    });
  } catch (error) {
    if (req.file?.path) {
      await deleteFile(req.file.path);
    }

    console.error("[TRANSCRIBE] error:", error);

    return res.status(500).json({
      error: "Speech-to-text failed",
      details: error.message,
    });
  }
}
