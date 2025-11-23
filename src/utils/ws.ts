// src/utils/ws.ts
let ws: WebSocket | null = null;
let lastUrl: string | null = null;

function computeWSUrl(): string {
  const raw = String((process.env as any)?.REACT_APP_WS_BASE || "").trim();

  const scheme =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "wss"
      : "ws";

  if (raw) return `${scheme}://${raw}/ws`;

  if (typeof window === "undefined" || !window.location)
    throw new Error("WebSocket is browser only");

  return `${scheme}://${window.location.host}/ws`;
}

export function connectWS(): WebSocket {
  const url = computeWSUrl();

  if (
    ws &&
    (ws.readyState === WebSocket.OPEN ||
    ws.readyState === WebSocket.CONNECTING) &&
    lastUrl === url
  )
    return ws;

  if (ws) try { ws.close(); } catch {}

  ws = new WebSocket(url);
  lastUrl = url;

  ws.onopen = () => console.log("[WS] open:", url);
  ws.onclose = () => console.log("[WS] closed");
  ws.onerror = (e) => console.warn("[WS] error", e);

  return ws;
}

export const getWS = () => ws;

export function disconnectWS() {
  if (ws) try { ws.close(); } catch {}
  ws = null;
  lastUrl = null;
}

export async function waitForWSOpen(timeoutMs = 1500) {
  const s = getWS() ?? connectWS();
  if (s.readyState === WebSocket.OPEN) return;

  await new Promise<void>((resolve) => {
    let done = false;

    const cleanup = () => {
      s.removeEventListener("open", onOpen);
      clearTimeout(timer);
    };

    const onOpen = () => {
      if (!done) {
        done = true;
        cleanup();
        resolve();
      }
    };

    const onTimeout = () => {
      if (!done) {
        done = true;
        cleanup();
        resolve();
      }
    };

    s.addEventListener("open", onOpen, { once: true });
    const timer = setTimeout(onTimeout, timeoutMs);
  });
}
