import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import {
  attachSocketToSession,
  deleteRealtimeSession,
  removeSocketFromSession,
} from "./session.store.js";

import { transcribeAudio } from "../services/stt.service.js";
import { generateReply } from "../services/ai.service.js";
import {
  appendToConversation,
  getConversationHistory,
  getOrCreateSession,
} from "../services/conversation.service.js";
import { validateReceptionistReply } from "../services/reply.validator.service.js";
import { generateSpeech } from "../services/tts.service.js";
import { deleteFile } from "../utils/deleteFile.js";
import { EVENTS } from "../constants/events.constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads");
const DEFAULT_AUDIO_MIME_TYPE = "audio/webm";

function sendJson(socket, payload) {
  if (socket.readyState !== socket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function sendError(socket, message, sessionId = null) {
  sendJson(socket, {
    type: EVENTS.ERROR,
    sessionId,
    message,
  });
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

function resetAudioState(audioState) {
  audioState.mimeType = DEFAULT_AUDIO_MIME_TYPE;
  audioState.chunks = [];
  audioState.startedAt = null;
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

async function handleSessionStart(socket, payload, state) {
  state.activeSessionId = payload.sessionId;

  if (!state.activeSessionId) {
    sendError(socket, "sessionId is required for session:start");
    return;
  }

  attachSocketToSession(state.activeSessionId, socket);
  getOrCreateSession(state.activeSessionId);

  sendJson(socket, {
    type: EVENTS.SESSION_READY,
    sessionId: state.activeSessionId,
    message: "Realtime session connected",
  });
}

function handlePing(socket, state) {
  sendJson(socket, {
    type: "pong",
    sessionId: state.activeSessionId,
    timestamp: Date.now(),
  });
}

async function handleConversationText(socket, payload, state) {
  if (!state.activeSessionId) {
    sendError(socket, "Start a session before sending conversation:text");
    return;
  }

  const text = payload.text?.trim();

  if (!text) {
    sendError(socket, "text is required for conversation:text", state.activeSessionId);
    return;
  }

  sendJson(socket, {
    type: EVENTS.PROCESSING_START,
    sessionId: state.activeSessionId,
    message: "Generating AI reply...",
  });

  const aiResult = await runAIFlow(state.activeSessionId, text);

  sendJson(socket, {
    type: EVENTS.TRANSCRIPT_FINAL,
    sessionId: state.activeSessionId,
    transcript: text,
  });

  sendJson(socket, {
    type: EVENTS.AI_REPLY,
    sessionId: aiResult.sessionId,
    reply: aiResult.reply,
    validationIssues: aiResult.validationIssues,
    businessContext: aiResult.businessContext,
  });

  sendJson(socket, {
    type: EVENTS.TTS_READY,
    sessionId: aiResult.sessionId,
    audioUrl: aiResult.audioUrl,
  });
}

function handleAudioChunk(socket, payload, state) {
  if (!state.activeSessionId) {
    sendError(socket, "Start a session before sending audio:chunk");
    return;
  }

  if (!payload.data) {
    sendError(socket, "data is required for audio:chunk", state.activeSessionId);
    return;
  }

  const chunkBuffer = Buffer.from(payload.data, "base64");

  if (!chunkBuffer.length) {
    sendError(socket, "Received empty audio chunk", state.activeSessionId);
    return;
  }

  state.audio.mimeType = payload.mimeType || state.audio.mimeType;
  state.audio.startedAt = state.audio.startedAt || Date.now();
  state.audio.chunks.push(chunkBuffer);
}

async function handleAudioEnd(socket, state) {
  if (!state.activeSessionId) {
    sendError(socket, "Start a session before sending audio:end");
    return;
  }

  if (!state.audio.chunks.length) {
    sendError(socket, "No audio chunks received before audio:end", state.activeSessionId);
    return;
  }

  sendJson(socket, {
    type: EVENTS.PROCESSING_START,
    sessionId: state.activeSessionId,
    message: "Transcribing audio...",
  });

  let savedAudioPath = null;

  try {
    savedAudioPath = await writeBufferedAudioToDisk(
      state.activeSessionId,
      state.audio
    );

    const sttResult = await transcribeAudio(savedAudioPath);
    const transcript = sttResult.transcript?.trim();

    if (!transcript) {
      sendError(socket, "No speech detected in the recording", state.activeSessionId);
      return;
    }

    sendJson(socket, {
      type: EVENTS.TRANSCRIPT_FINAL,
      sessionId: state.activeSessionId,
      transcript,
      language: sttResult.language,
      duration: sttResult.duration,
      segments: sttResult.segments,
    });

    sendJson(socket, {
      type: EVENTS.PROCESSING_START,
      sessionId: state.activeSessionId,
      message: "Generating AI reply...",
    });

    const aiResult = await runAIFlow(state.activeSessionId, transcript);

    sendJson(socket, {
      type: EVENTS.AI_REPLY,
      sessionId: aiResult.sessionId,
      reply: aiResult.reply,
      validationIssues: aiResult.validationIssues,
      businessContext: aiResult.businessContext,
    });

    sendJson(socket, {
      type: EVENTS.TTS_READY,
      sessionId: aiResult.sessionId,
      audioUrl: aiResult.audioUrl,
    });
  } finally {
    resetAudioState(state.audio);

    if (savedAudioPath) {
      await deleteFile(savedAudioPath);
    }
  }
}

async function handleMessage(socket, rawMessage, isBinary, state) {
  if (isBinary) {
    sendError(
      socket,
      "Binary websocket streaming is not supported yet. Send JSON with base64 audio chunks.",
      state.activeSessionId
    );
    return;
  }

  let payload;

  try {
    payload = JSON.parse(rawMessage.toString());
  } catch (error) {
    sendError(socket, `Invalid socket payload: ${error.message}`, state.activeSessionId);
    return;
  }

  switch (payload.type) {
    case EVENTS.SESSION_START:
      await handleSessionStart(socket, payload, state);
      break;

    case "ping":
      handlePing(socket, state);
      break;

    case "conversation:text":
      await handleConversationText(socket, payload, state);
      break;

    case EVENTS.AUDIO_CHUNK:
      handleAudioChunk(socket, payload, state);
      break;

    case EVENTS.AUDIO_END:
      await handleAudioEnd(socket, state);
      break;

    default:
      sendError(
        socket,
        `Unsupported message type: ${payload.type || "unknown"}`,
        state.activeSessionId
      );
  }
}

export function handleSocketConnection(socket) {
  const state = {
    activeSessionId: null,
    audio: {
      mimeType: DEFAULT_AUDIO_MIME_TYPE,
      chunks: [],
      startedAt: null,
    },
  };

  socket.on("message", async (rawMessage, isBinary) => {
    try {
      await handleMessage(socket, rawMessage, isBinary, state);
    } catch (error) {
      sendError(
        socket,
        error.message || "Realtime processing failed",
        state.activeSessionId
      );
    }
  });

  socket.on("close", () => {
    resetAudioState(state.audio);

    if (state.activeSessionId) {
      removeSocketFromSession(state.activeSessionId);
      deleteRealtimeSession(state.activeSessionId);
    }
  });
}