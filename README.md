# CodePad

A collaborative Python pad for interviews and pair practice, in the spirit of CoderPad.

- **Live, Google-Docs-style editing.** Everyone in a session sees each other's typing, cursors and selections in real time, with name labels.
- **Run Python in the browser.** Code runs in [Pyodide](https://pyodide.org) (CPython compiled to WebAssembly) inside a Web Worker. No execution server is needed, and infinite loops are killed by **Stop** or a 10s timeout.
- **Test cases per question.** **Run tests** checks the solution and shows pass/fail, input, expected and actual output.
- **Shared output.** Whoever presses Run, everyone in the room sees the console output and test results.
- **Question panel and switcher.** The prompt sits on the left. Switching questions moves everyone in the session, and each question keeps its own code.

Included questions:

| Question | Link (starts a new session) |
| --- | --- |
| Garden Watering Optimization (Parts 1 & 2) | `/q/garden-watering` |
| Best Time to Buy and Sell Stock | `/q/best-time-to-buy-and-sell-stock` |
| Valid Parentheses | `/q/valid-parentheses` |

A session URL looks like `/s/<session-id>/<question>`. Share it and others join the same pad.

## How it works

```
 Browser A ──┐                         ┌── Browser B
  CodeMirror 6 + y-codemirror.next      CodeMirror 6 + y-codemirror.next
  Y.Doc (CRDT) ◄──── sync provider ────► Y.Doc (CRDT)
  Pyodide worker                        Pyodide worker
```

- **Sync:** [Yjs](https://yjs.dev), a CRDT, keeps one shared `Y.Doc` per session. It holds `code:<question>` (`Y.Text`), `run:<question>` (shared output), and `meta` (current question). Awareness carries cursors and presence.
- **Transport:** Vercel functions are serverless and can't hold WebSockets open, so production uses [Liveblocks](https://liveblocks.io) (hosted Yjs, free tier). Locally, a tiny `y-websocket` server (`server/sync-server.mjs`) is used. You can also self-host that server and point `NEXT_PUBLIC_YJS_WS_URL` at it.
- **Execution:** Pyodide runs client-side, so nothing runs on the server and nothing is sandboxed server-side.

## Run locally

```bash
npm install
npm run dev     # Next.js on :3000 + Yjs sync server on :1234
```

Open http://localhost:3000 and start a session. Open the session URL in a second window, or on another device on your network via `http://<your-LAN-IP>:3000/...`, to see live typing.

## Deploy to Vercel

1. Create a free Liveblocks account and copy your **public** key from https://liveblocks.io/dashboard/apikeys (it starts with `pk_`).
2. Import this repo in Vercel (https://vercel.com/new). The framework is detected as Next.js.
3. Add the environment variable `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_...`, then deploy.
4. Share `https://<your-app>.vercel.app/`.

To use Liveblocks locally too, put the key in `.env.local`. When the key is set, the local sync server isn't used.

## Adding a question

Add an entry to `QUESTIONS` in `lib/questions.ts`:

- `description`: Markdown for the left panel.
- `starter`: the initial editor code.
- `tests`: Python source that defines `CASES = [{"name", "func", "args", "expected"}, ...]`. Optionally also define `check(case, got) -> (ok, expected_description)` for problems with several valid answers (see Garden Watering).

## Scripts

| Script | What |
| --- | --- |
| `npm run dev` | Next dev server + local sync server |
| `npm run build` / `start` | Production build / serve |
| `npm run sync-server` | Just the Yjs WebSocket server (`PORT`, `HOST` env vars) |
| `npm run typecheck` | TypeScript check |
