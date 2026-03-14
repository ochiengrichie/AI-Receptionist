import { transcribeAudio} from "../services/transcribe.service.js";
import { deleteFile } from "../utils/deleteFile.js";

export async function handleTranscription(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    const result = await transcribeAudio(req.file.path);

    await deleteFile(req.file.path);

    return res.status(200).json({
      message: "Transcription successful",
      transcript: result.transcript,
      language: result.language,
      duration: result.duration,
    });
  } catch (error) {
    if (req.file?.path) {
      await deleteFile(req.file.path);
    }

    return res.status(500).json({
      error: "Speech-to-text failed",
      details: error.message,
    });
  }
}