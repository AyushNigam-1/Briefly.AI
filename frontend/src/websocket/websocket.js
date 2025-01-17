let ws;

export const connectWebSocket = (url) => {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    ws = new WebSocket(url);
    console.log("WebSocket connection initialized");
  }
  return ws;
};

export const getWebSocketInstance = () => ws;

export const closeWebSocket = () => {
  if (ws) {
    ws.close();
    console.log("WebSocket connection closed");
  }
};
