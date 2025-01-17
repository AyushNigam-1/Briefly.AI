import { ProgressResponse } from "@/app/types";
import { getWebSocketInstance } from "./websocket";

interface WebSocketListeners {
  onMessage?: (data: ProgressResponse) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export const setupWebSocketListeners = ({
  onMessage,
  onOpen,
  onClose,
  onError,
}: WebSocketListeners): void => {
  const ws = getWebSocketInstance();

  if (!ws) {
    console.error("WebSocket instance is not initialized.");
    return;
  }

  if (onOpen) ws.onopen = onOpen;
  if (onMessage) {
    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: ProgressResponse = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }
  if (onClose) ws.onclose = onClose;
  if (onError) ws.onerror = onError;
};
