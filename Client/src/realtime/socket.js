function buildWebSocketUrl() {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const normalizedBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
  const url = new URL(normalizedBase);

  // Convert http/https into ws/wss
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/realtime";

  return url.toString();
}

export function createRealtimeSocket({  onOpen,  onClose,  onError,  onMessage,} = {}) {
  const ws = new WebSocket(buildWebSocketUrl());

  ws.addEventListener("open", () => {
    onOpen?.();
  });

  ws.addEventListener("close", (event) => {
    onClose?.(event);
  });

  ws.addEventListener("error", (event) => {
    onError?.(event);
  });

  ws.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      onMessage?.(payload);
    } catch (error) {
      onError?.(error);
    }
  });

  return {
    send(type, data = {}) {
      if (ws.readyState !== WebSocket.OPEN) {
        throw new Error("Realtime socket is not connected");
      }

      ws.send(
        JSON.stringify({
          type,
          ...data,
        })
      );
    },

    close() {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    },

    get readyState() {
      return ws.readyState;
    },

    get rawSocket() {
      return ws;
    },
  };
}