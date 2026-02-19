import { writable, type Readable } from "svelte/store";

export interface WSMessage {
  type: string;
  data: unknown;
}

interface WebSocketStoreState {
  connected: boolean;
  lastMessage: WSMessage | null;
}

export function createWebSocketStore(url: string) {
  const { subscribe, set, update } = writable<WebSocketStoreState>({
    connected: false,
    lastMessage: null,
  });

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = true;

  function connect() {
    if (typeof window === "undefined") return;

    ws = new WebSocket(url);

    ws.onopen = () => {
      update((s) => ({ ...s, connected: true }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        update((s) => ({ ...s, lastMessage: msg }));
      } catch {}
    };

    ws.onclose = () => {
      update((s) => ({ ...s, connected: false }));
      if (shouldReconnect) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function disconnect() {
    shouldReconnect = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
    set({ connected: false, lastMessage: null });
  }

  function send(data: unknown) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  connect();

  return {
    subscribe,
    send,
    disconnect,
  };
}
