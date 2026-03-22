const sessions = new Map();

function buildSession(sessionId) {
  return {
    sessionId,
    socket: null,
    audioChunks: [],
    mimeType: "audio/webm",
    isProcessing: false,
    connectedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function getOrCreateRealtimeSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, buildSession(sessionId));
  }

  const session = sessions.get(sessionId);
  session.updatedAt = Date.now();
  return session;
}

export function attachSocketToSession(sessionId, socket) {
  const session = getOrCreateRealtimeSession(sessionId);
  session.socket = socket;
  session.updatedAt = Date.now();
  return session;
}

export function appendAudioChunk(sessionId, chunkBuffer, mimeType) {
  const session = getOrCreateRealtimeSession(sessionId);
  session.audioChunks.push(chunkBuffer);
  if (mimeType) {
    session.mimeType = mimeType;
  }
  session.updatedAt = Date.now();
  return session;
}

export function consumeAudioChunks(sessionId) {
  const session = getOrCreateRealtimeSession(sessionId);
  const chunks = session.audioChunks;
  session.audioChunks = [];
  session.updatedAt = Date.now();
  return {
    chunks,
    mimeType: session.mimeType,
  };
}

export function setSessionProcessing(sessionId, isProcessing) {
  const session = getOrCreateRealtimeSession(sessionId);
  session.isProcessing = isProcessing;
  session.updatedAt = Date.now();
  return session;
}

export function isSessionProcessing(sessionId) {
  return getOrCreateRealtimeSession(sessionId).isProcessing;
}

export function removeSocketFromSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  session.socket = null;
  session.updatedAt = Date.now();
}

export function deleteRealtimeSession(sessionId) {
  sessions.delete(sessionId);
}
