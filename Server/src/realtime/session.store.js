const sessions = new Map();

function buildSession(sessionId) {
  return {
    id: sessionId,
    socket: null,
    connectedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function updateSession(session) {
  session.updatedAt = Date.now();
  return session;
}

export function getOrCreateRealtimeSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, buildSession(sessionId));
  }

  return updateSession(sessions.get(sessionId));
}

export function attachSocketToSession(sessionId, socket) {
  const session = getOrCreateRealtimeSession(sessionId);

  session.socket = socket;

  return updateSession(session);
}

export function removeSocketFromSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.socket = null;
  updateSession(session);
}

export function deleteRealtimeSession(sessionId) {
  sessions.delete(sessionId);
}

/* -------------------- OPTIONAL HELPERS (useful later) -------------------- */

export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

export function getAllSessions() {
  return Array.from(sessions.values());
}

export function hasSession(sessionId) {
  return sessions.has(sessionId);
}