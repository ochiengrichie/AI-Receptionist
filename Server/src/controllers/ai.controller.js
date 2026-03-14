import { generateReply } from "../services/ai.service.js";

export async function handleAIReply(req, res) {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const reply = await generateReply(message);

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "AI generation failed",
      details: error.message,
    });
  }
}