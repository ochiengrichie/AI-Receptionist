const sessions = new Map();

//This is a helper function to create a new session object with the given sessionId.
function buildSession(sessionId) {
  return {
    sessionId,
    socket: null,
    connectedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// This function retrieves an existing session by sessionId or creates a new one if it doesn't exist.
export function getOrCreateRealtimeSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, buildSession(sessionId));
  }

  const session = sessions.get(sessionId);
  session.updatedAt = Date.now();
  return session;
}

// This function attaches a WebSocket connection (socket) to a session identified by sessionId.
export function attachSocketToSession(sessionId, socket) {
  const session = getOrCreateRealtimeSession(sessionId);
  session.socket = socket;
  session.updatedAt = Date.now();
  return session;
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
