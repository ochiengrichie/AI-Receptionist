const PORT = Number(process.env.PORT) || 3000;

export const env = {
  PORT,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || "",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
};

if (!env.PORT) {
  throw new Error("PORT is required");
}