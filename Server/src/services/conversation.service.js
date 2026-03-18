import crypto from "crypto";

const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 30;
const MAX_HISTORY_MESSAGES = 12;

function pruneExpiredSessions() {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
}

function createSession(sessionId = crypto.randomUUID()) {
  const session = {
    id: sessionId,
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  sessions.set(sessionId, session);
  return session;
}

export function getOrCreateSession(sessionId) {
  pruneExpiredSessions();

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    session.updatedAt = Date.now();
    return session;
  }

  return createSession(sessionId);
}

export function appendToConversation(sessionId, role, content) {
  const session = getOrCreateSession(sessionId);

  session.history.push({
    role,
    content,
    timestamp: Date.now(),
  });

  if (session.history.length > MAX_HISTORY_MESSAGES) {
    session.history = session.history.slice(-MAX_HISTORY_MESSAGES);
  }

  session.updatedAt = Date.now();
  return session;
}

export function getConversationHistory(sessionId) {
  return getOrCreateSession(sessionId).history.map(({ role, content }) => ({
    role,
    content,
  }));
}
