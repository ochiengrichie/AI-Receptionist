const PORT = Number(process.env.PORT) || 3000;

export const env = {
  PORT,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct",
  OPENAI_TTS_API_KEY: process.env.OPENAI_TTS_API_KEY || process.env.OPENAI_API_KEY || "",
  GROK_API_KEY: process.env.GROK_API_KEY || "",
  GROK_MODEL: process.env.GROK_MODEL || "grok-4.20-beta-latest-non-reasoning",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "llama3.2:1b",
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",

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
