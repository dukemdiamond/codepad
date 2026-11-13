// Minimal Yjs WebSocket sync server for local development (or self-hosting).
// Documents live in memory; they reset when the process restarts.
import http from "node:http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "@y/websocket-server/utils";

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 1234);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("codepad sync server ok");
});

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (conn, req) => setupWSConnection(conn, req));

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

server.listen(port, host, () => {
  console.log(`Yjs websocket server listening on ws://${host}:${port}`);
});
