import axios from "axios";

export async function generateReply(message) {
  const response = await axios.post("http://localhost:11434/api/generate", {
    model: "llama3.2:1b",
    prompt: `
You are a professional business receptionist.
You speak politely and help callers schedule meetings.
Keep responses short and helpful.

Caller: ${message}
Receptionist:
`,
    stream: false,
  });

  return response.data.response;
}