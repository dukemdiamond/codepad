// Realtime transport for the shared Y.Doc.
//  - NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY set  -> Liveblocks (works on Vercel, no server to run)
//  - else NEXT_PUBLIC_YJS_WS_URL / ws://<host>:1234 -> self-hosted y-websocket (local dev)
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

export type SyncConnection = {
  doc: Y.Doc;
  awareness: Awareness;
  backend: "liveblocks" | "websocket";
  onSynced: (cb: () => void) => void;
  onStatus: (cb: (connected: boolean) => void) => void;
  destroy: () => void;
};

const LB_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
const WS_URL = process.env.NEXT_PUBLIC_YJS_WS_URL;

/** True when running on a real host (not localhost/LAN) with no sync backend configured. */
export function syncMisconfigured() {
  if (LB_KEY || WS_URL) return false;
  const h = location.hostname;
  return !(h === "localhost" || h === "127.0.0.1" || h.endsWith(".local") || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h));
}

export async function connect(roomId: string): Promise<SyncConnection> {
  const doc = new Y.Doc();
  const name = `codepad-${roomId}`;

  if (LB_KEY) {
    const [{ createClient }, { LiveblocksYjsProvider }] = await Promise.all([
      import("@liveblocks/client"),
      import("@liveblocks/yjs"),
    ]);
    const client = createClient({ publicApiKey: LB_KEY });
    const { room, leave } = client.enterRoom(name, { initialPresence: {} });
    const provider = new LiveblocksYjsProvider(room, doc);
    return {
      doc,
      awareness: provider.awareness as unknown as Awareness,
      backend: "liveblocks",
      onSynced: (cb) => {
        if (provider.synced) cb();
        else {
          const h = (s: boolean) => {
            if (s) {
              provider.off("sync", h);
              cb();
            }
          };
          provider.on("sync", h);
        }
      },
      onStatus: (cb) => {
        cb(room.getStatus() === "connected");
        room.subscribe("status", (s) => cb(s === "connected"));
      },
      destroy: () => {
        provider.destroy();
        leave();
        doc.destroy();
      },
    };
  }

  const { WebsocketProvider } = await import("y-websocket");
  const url =
    WS_URL ||
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:1234`;
  const provider = new WebsocketProvider(url, name, doc);
  return {
    doc,
    awareness: provider.awareness,
    backend: "websocket",
    onSynced: (cb) => {
      if (provider.synced) cb();
      else {
        const h = (s: boolean) => {
          if (s) {
            provider.off("sync", h);
            cb();
          }
        };
        provider.on("sync", h);
      }
    },
    onStatus: (cb) => {
      cb(provider.wsconnected);
      provider.on("status", (e: { status: string }) => cb(e.status === "connected"));
    },
    destroy: () => {
      provider.destroy();
      doc.destroy();
    },
  };
}

// ---- Identity / colors ---------------------------------------------------

const COLORS = [
  "#f87171", "#fb923c", "#facc15", "#4ade80", "#2dd4bf",
  "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#a3e635",
];

export function pickColor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function randomId(len = 8) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) s += abc[b % abc.length];
  return s;
}
