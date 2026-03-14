import generateSpeech from "../services/tts.service.js";

export async function handleTTS(req, res) {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await generateSpeech(text);

    return res.status(200).json({
      message: "TTS successful",
      audioUrl: `http://localhost:3000/audio/${result.fileName}`,
    });
  } catch (error) {
    console.error("TTS error:", error);

    return res.status(500).json({
      error: "Text-to-speech failed",
      details: error.message || String(error),
    });
  }
}