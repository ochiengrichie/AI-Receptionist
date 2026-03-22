const WS_BASE = (import.meta.env.VITE_WS_BASE_URL || "").replace(/\/$/, "");

function resolveSocketUrl() {
  if (WS_BASE) {
    return `${WS_BASE}/realtime`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//localhost:3000/realtime`;
}

export function createRealtimeSocket({ onOpen, onClose, onError, onMessage } = {}) {
  const socket = new WebSocket(resolveSocketUrl());

  socket.addEventListener("open", () => {
    onOpen?.();
  });

  socket.addEventListener("close", (event) => {
    onClose?.(event);
  });

  socket.addEventListener("error", (event) => {
    onError?.(event);
  });

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      onMessage?.(payload);
    } catch (error) {
      onError?.(error);
    }
  });

  return {
    socket,
    send(type, payload = {}) {
      if (socket.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not connected yet");
      }

      socket.send(
        JSON.stringify({
          type,
          ...payload,
        })
      );
    },
    close() {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    },
  };
}
