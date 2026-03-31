import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { attachSocketToSession,  deleteRealtimeSession,  removeSocketFromSession,} from "./session.store.js";
import { transcribeAudio } from "../services/transcribe.service.js";
import { generateReply } from "../services/ai.service.js";
import { appendToConversation, getConversationHistory, getOrCreateSession } from "../services/conversation.service.js";
import { validateReceptionistReply } from "../services/reply.validator.service.js";
import generateSpeech from "../services/tts.service.js";
import { deleteFile } from "../utils/deleteFile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads");

function sendJson(socket, payload) {
  if (socket.readyState !== socket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function guessExtensionFromMimeType(mimeType = "") {
  const normalized = mimeType.toLowerCase();

  if (normalized.includes("webm")) return ".webm";
  if (normalized.includes("wav")) return ".wav";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return ".mp3";
  if (normalized.includes("ogg")) return ".ogg";
  if (normalized.includes("mp4")) return ".mp4";

  return ".webm";
}

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

async function writeBufferedAudioToDisk(sessionId, audioState) {
  if (!audioState.chunks.length) {
    throw new Error("No audio chunks received");
  }

  await ensureUploadsDir();

  const ext = guessExtensionFromMimeType(audioState.mimeType);
  const fileName = `${sessionId}-${Date.now()}${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  const fileBuffer = Buffer.concat(audioState.chunks);
  await fs.writeFile(filePath, fileBuffer);

  return filePath;
}

async function runAIFlow(sessionId, userText) {
  const session = getOrCreateSession(sessionId);
  const history = getConversationHistory(session.id);

  const { reply: rawReply, context } = await generateReply({
    message: userText,
    history,
  });

  const validated = validateReceptionistReply({
    userMessage: userText,
    reply: rawReply,
    context,
  });

  appendToConversation(session.id, "user", userText);
  appendToConversation(session.id, "assistant", validated.reply);

  const ttsResult = await generateSpeech(validated.reply);

  return {
    sessionId: session.id,
    reply: validated.reply,
    validationIssues: validated.issues,
    businessContext: {
      businessName: context.businessName,
      receptionistName: context.receptionistName,
      businessHours: context.businessHours,
      servicesOffered: context.servicesOffered,
    },
    audioUrl: `/audio/${ttsResult.fileName}`,
  };
}

export function handleSocketConnection(socket) {
  let activeSessionId = null;

  const audioState = {
    mimeType: "audio/webm",
    chunks: [],
    startedAt: null,
  };

  socket.on("message", async (rawMessage, isBinary) => {
    if (isBinary) {
      sendJson(socket, {
        type: "error",
        message:
          "Binary websocket streaming is not supported yet. Send JSON with base64 audio chunks.",
      });
      return;
    }

    let payload;

    try {
      payload = JSON.parse(rawMessage.toString());
    } catch (error) {
      sendJson(socket, {
        type: "error",
        message: `Invalid socket payload: ${error.message}`,
      });
      return;
    }

    try {
      switch (payload.type) {
        case "session:start": {
          activeSessionId = payload.sessionId;

          if (!activeSessionId) {
            sendJson(socket, {
              type: "error",
              message: "sessionId is required for session:start",
            });
            return;
          }

          attachSocketToSession(activeSessionId, socket);
          getOrCreateSession(activeSessionId);

          sendJson(socket, {
            type: "session:ready",
            sessionId: activeSessionId,
            message: "Realtime session connected",
          });
          break;
        }

        case "ping": {
          sendJson(socket, {
            type: "pong",
            sessionId: activeSessionId,
            timestamp: Date.now(),
          });
          break;
        }

        case "conversation:text": {
          if (!activeSessionId) {
            sendJson(socket, {
              type: "error",
              message: "Start a session before sending conversation:text",
            });
            return;
          }

          const text = payload.text?.trim();

          if (!text) {
            sendJson(socket, {
              type: "error",
              message: "text is required for conversation:text",
            });
            return;
          }

          sendJson(socket, {
            type: "processing:start",
            sessionId: activeSessionId,
            message: "Generating AI reply...",
          });

          const aiResult = await runAIFlow(activeSessionId, text);

          sendJson(socket, {
            type: "transcript:final",
            sessionId: activeSessionId,
            transcript: text,
          });

          sendJson(socket, {
            type: "ai:reply",
            sessionId: aiResult.sessionId,
            reply: aiResult.reply,
            validationIssues: aiResult.validationIssues,
            businessContext: aiResult.businessContext,
          });

          sendJson(socket, {
            type: "tts:ready",
            sessionId: aiResult.sessionId,
            audioUrl: aiResult.audioUrl,
          });

          break;
        }

        case "audio:chunk": {
          if (!activeSessionId) {
            sendJson(socket, {
              type: "error",
              message: "Start a session before sending audio:chunk",
            });
            return;
          }

          if (!payload.data) {
            sendJson(socket, {
              type: "error",
              message: "data is required for audio:chunk",
            });
            return;
          }

          const chunkBuffer = Buffer.from(payload.data, "base64");

          if (!chunkBuffer.length) {
            sendJson(socket, {
              type: "error",
              message: "Received empty audio chunk",
            });
            return;
          }

          audioState.mimeType = payload.mimeType || audioState.mimeType;
          audioState.startedAt = audioState.startedAt || Date.now();
          audioState.chunks.push(chunkBuffer);

          break;
        }

        case "audio:end": {
          if (!activeSessionId) {
            sendJson(socket, {
              type: "error",
              message: "Start a session before sending audio:end",
            });
            return;
          }

          if (!audioState.chunks.length) {
            sendJson(socket, {
              type: "error",
              message: "No audio chunks received before audio:end",
            });
            return;
          }

          sendJson(socket, {
            type: "processing:start",
            sessionId: activeSessionId,
            message: "Transcribing audio...",
          });

          let savedAudioPath = null;

          try {
            savedAudioPath = await writeBufferedAudioToDisk(
              activeSessionId,
              audioState
            );

            const sttResult = await transcribeAudio(savedAudioPath);
            const transcript = sttResult.transcript?.trim();

            if (!transcript) {
              sendJson(socket, {
                type: "error",
                sessionId: activeSessionId,
                message: "No speech detected in the recording",
              });
              return;
            }

            sendJson(socket, {
              type: "transcript:final",
              sessionId: activeSessionId,
              transcript,
              language: sttResult.language,
              duration: sttResult.duration,
              segments: sttResult.segments,
            });

            sendJson(socket, {
              type: "processing:start",
              sessionId: activeSessionId,
              message: "Generating AI reply...",
            });

            const aiResult = await runAIFlow(activeSessionId, transcript);

            sendJson(socket, {
              type: "ai:reply",
              sessionId: aiResult.sessionId,
              reply: aiResult.reply,
              validationIssues: aiResult.validationIssues,
              businessContext: aiResult.businessContext,
            });

            sendJson(socket, {
              type: "tts:ready",
              sessionId: aiResult.sessionId,
              audioUrl: aiResult.audioUrl,
            });
          } finally {
            audioState.chunks = [];
            audioState.startedAt = null;
            audioState.mimeType = "audio/webm";

            if (savedAudioPath) {
              await deleteFile(savedAudioPath);
            }
          }

          break;
        }

        default: {
          sendJson(socket, {
            type: "error",
            message: `Unsupported message type: ${payload.type || "unknown"}`,
          });
        }
      }
    } catch (error) {
      sendJson(socket, {
        type: "error",
        sessionId: activeSessionId,
        message: error.message || "Realtime processing failed",
      });
    }
  });

  socket.on("close", () => {
    audioState.chunks = [];
    audioState.startedAt = null;
    audioState.mimeType = "audio/webm";

    if (activeSessionId) {
      removeSocketFromSession(activeSessionId);
      deleteRealtimeSession(activeSessionId);
    }
  });
};