import axios from "axios";
import { getBusinessContext } from "../config/business.config.js";
import { env } from "../config/env.config.js";

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

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item?.role && item?.content)
    .map((item) => ({
      role: item.role,
      content: String(item.content).trim(),
    }))
    .filter((item) => item.content.length > 0);
}

export async function generateReply({ message, history = [] }) {
  if (!message?.trim()) {
    throw new Error("message is required for generateReply");
  }

  const context = getBusinessContext();
  const normalizedHistory = normalizeHistory(history);

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(context),
        },
        ...normalizedHistory,
        {
          role: "user",
          content: message.trim(),
        },
      ],
      temperature: 0.5,
    },
    {
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const reply = response.data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("LLM returned an empty reply");
  }

  return { reply, context };
}
