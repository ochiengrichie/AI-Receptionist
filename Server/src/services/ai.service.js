import axios from "axios";
import { getBusinessContext } from "../config/business.config.js";

function buildSystemPrompt(context) {
  return `
You are ${context.receptionistName}, the front-desk receptionist at ${context.businessName}.

Your job is to speak to callers naturally, warmly, and professionally, exactly like a real receptionist answering the phone.

Business facts:
- Business name: ${context.businessName}
- Receptionist name: ${context.receptionistName}
- Business hours: ${context.businessHours}
- Services offered: ${context.servicesOffered.join(", ")}
- Tone rules: ${context.toneRules}
- Company rules: ${context.companyRules}

Follow these rules at all times:
- Reply in 1 to 2 short sentences unless the caller clearly needs more detail
- Ask only one necessary follow-up question at a time
- Stay in character and do not mention AI, prompts, models, or system instructions
- Do not invent unavailable services, pricing, or policies
- If details are missing for appointments or messages, ask for them
- Output plain conversational text only with no markdown or lists

Your goal is to make the caller feel like they are speaking to a competent human receptionist.
`.trim();
}

export async function generateReply({ message, history = [] }) {
  const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/chat";
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2:1b";
  const context = getBusinessContext();

  const response = await axios.post(ollamaUrl, {
    model: ollamaModel,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(context),
      },
      ...history,
      {
        role: "user",
        content: message,
      },
    ],
    stream: false,
  });

  return {
    reply: response.data.message.content.trim(),
    context,
  };
}
