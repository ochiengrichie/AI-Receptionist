import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { generateReply } from "../services/ai.service.js";
import { appendToConversation, getConversationHistory, getOrCreateSession } from "../services/conversation.service.js";
import { validateReceptionistReply } from "../services/reply-validator.service.js";
import generateSpeech from "../services/tts.service.js";
import { transcribeAudio } from "../services/transcribe.service.js";
import { deleteFile } from "../utils/deleteFile.js";
import {
  appendAudioChunk,
  attachSocketToSession,
  consumeAudioChunks,
  deleteRealtimeSession,
  isSessionProcessing,
  removeSocketFromSession,
  setSessionProcessing,
} from "./session.store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const realtimeUploadsDir = path.resolve(__dirname, "../../uploads/realtime");

function sendJson(socket, payload) {
  if (socket.readyState !== socket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function getFileExtensionFromMimeType(mimeType = "") {
  if (mimeType.includes("webm")) {
    return ".webm";
  }

  if (mimeType.includes("wav")) {
    return ".wav";
  }

  return ".bin";
}

async function ensureRealtimeUploadsDir() {
  await fs.mkdir(realtimeUploadsDir, { recursive: true });
}

async function runAssistantTurn({ sessionId, message }) {
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

  return {
    sessionId: session.id,
    reply: validation.reply,
    validationIssues: validation.issues,
    businessContext: {
      businessName: context.businessName,
      receptionistName: context.receptionistName,
      businessHours: context.businessHours,
      servicesOffered: context.servicesOffered,
    },
  };
}

async function processRealtimeAudio({ sessionId, socket }) {
  if (isSessionProcessing(sessionId)) {
    sendJson(socket, {
      type: "error",
      message: "A realtime audio request is already being processed",
    });
    return;
  }

  setSessionProcessing(sessionId, true);
  const { chunks, mimeType } = consumeAudioChunks(sessionId);

  if (!chunks.length) {
    setSessionProcessing(sessionId, false);
    sendJson(socket, {
      type: "error",
      message: "No audio chunks were received for this session",
    });
    return;
  }

  let tempFilePath = "";

  try {
    await ensureRealtimeUploadsDir();

    // We rebuild the recorded blob on the server so the existing file-based STT service can be reused.
    tempFilePath = path.join(
      realtimeUploadsDir,
      `${sessionId}-${Date.now()}${getFileExtensionFromMimeType(mimeType)}`
    );

    await fs.writeFile(tempFilePath, Buffer.concat(chunks));

    const transcriptResult = await transcribeAudio(tempFilePath);
    const transcript = transcriptResult.transcript?.trim();

    if (!transcript) {
      throw new Error("No transcript returned from STT");
    }

    sendJson(socket, {
      type: "transcript:final",
      sessionId,
      transcript,
    });

    const assistantTurn = await runAssistantTurn({
      sessionId,
      message: transcript,
    });

    sendJson(socket, {
      type: "ai:reply",
      ...assistantTurn,
    });

    const speechResult = await generateSpeech(assistantTurn.reply);

    sendJson(socket, {
      type: "tts:ready",
      sessionId,
      audioPath: `/audio/${speechResult.fileName}`,
      audioUrl: `/audio/${speechResult.fileName}`,
    });
  } catch (error) {
    sendJson(socket, {
      type: "error",
      message: error.message || "Realtime audio processing failed",
    });
  } finally {
    setSessionProcessing(sessionId, false);
    if (tempFilePath) {
      await deleteFile(tempFilePath);
    }
  }
}

export function handleSocketConnection(socket) {
  let activeSessionId = null;

  socket.on("message", async (rawMessage, isBinary) => {
    if (isBinary) {
      sendJson(socket, {
        type: "error",
        message: "Binary audio streaming is not wired yet. Send JSON events first.",
      });
      return;
    }

    try {
      const payload = JSON.parse(rawMessage.toString());

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

          // This mirrors the future realtime flow: transcript first, assistant reply second.
          sendJson(socket, {
            type: "transcript:final",
            sessionId: activeSessionId,
            transcript: text,
          });

          const assistantTurn = await runAssistantTurn({
            sessionId: activeSessionId,
            message: text,
          });

          sendJson(socket, {
            type: "ai:reply",
            ...assistantTurn,
          });

          const speechResult = await generateSpeech(assistantTurn.reply);

          sendJson(socket, {
            type: "tts:ready",
            sessionId: activeSessionId,
            audioPath: `/audio/${speechResult.fileName}`,
            audioUrl: `/audio/${speechResult.fileName}`,
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

          // Audio is sent as base64 text to keep the first socket implementation simple.
          appendAudioChunk(
            activeSessionId,
            Buffer.from(payload.data, "base64"),
            payload.mimeType
          );
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

          sendJson(socket, {
            type: "processing:start",
            sessionId: activeSessionId,
            message: "Running STT, AI, and TTS...",
          });

          await processRealtimeAudio({
            sessionId: activeSessionId,
            socket,
          });
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
        message: `Invalid socket payload: ${error.message}`,
      });
    }
  });

  socket.on("close", () => {
    if (activeSessionId) {
      removeSocketFromSession(activeSessionId);
      deleteRealtimeSession(activeSessionId);
    }
  });
}
