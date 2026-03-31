import { generateReply } from "../services/ai.service.js";
import { appendToConversation, getConversationHistory, getOrCreateSession,} from "../services/conversation.service.js";
import { validateReceptionistReply } from "../services/reply.validator.service.js";

export async function handleAIReply(req, res) {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const session = getOrCreateSession(sessionId);
    const history = getConversationHistory(session.id);
    const { reply: rawReply, context } = await generateReply({
      message,
      history,
    });
    const validation = validateReceptionistReply({
      userMessage: message,
      reply: rawReply,
      context,
    });

    appendToConversation(session.id, "user", message);
    appendToConversation(session.id, "assistant", validation.reply);

    return res.status(200).json({
      reply: validation.reply,
      sessionId: session.id,
      validationIssues: validation.issues,
      historyLength: getConversationHistory(session.id).length,
      businessContext: {
        businessName: context.businessName,
        receptionistName: context.receptionistName,
        businessHours: context.businessHours,
        servicesOffered: context.servicesOffered,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "AI generation failed",
      details: error.message,
    });
  }
}
