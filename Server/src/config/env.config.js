const PORT = Number(process.env.PORT) || 3000;

export const env = {
  PORT,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || "",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_TTS_MODEL: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  OPENAI_TTS_VOICE: process.env.OPENAI_TTS_VOICE || "alloy",

  BUSINESS_NAME: process.env.BUSINESS_NAME,
  RECEPTIONIST_NAME: process.env.RECEPTIONIST_NAME,
  BUSINESS_HOURS: process.env.BUSINESS_HOURS,
  SERVICES_OFFERED: process.env.SERVICES_OFFERED,
  TONE_RULES: process.env.TONE_RULES,
  COMPANY_RULES: process.env.COMPANY_RULES,
};

if (!env.PORT) {
  throw new Error("PORT is required");
}