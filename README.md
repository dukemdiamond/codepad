# CodePad

A shared Python editor for mock interviews and pair practice. Open a session, send the link to a friend, and you're both typing in the same file. You see each other's cursors, run code in the browser, and check it against test cases.

## What it does

- **Live editing.** Everyone in a session sees each other's typing, cursors and selections as they happen.
- **Python runs in your browser.** Code runs in [Pyodide](https://pyodide.org) inside a Web Worker, so no server executes anything. Infinite loops get killed by the Stop button or a 10 second timeout.
- **Tests for every problem.** "Run tests" shows pass/fail for each case, with the input, the expected output and what your code returned.
- **Shared output.** Whoever hits Run, everyone in the room sees the result.
- **One session, many problems.** Switching problems moves the whole room, and each problem keeps its own code.

## Problems

| Problem | Difficulty |
| --- | --- |
| Garden Watering Optimization (2 parts, with a visualizer) | Medium |
| Two Sum | Easy |
| Best Time to Buy and Sell Stock | Easy |
| Valid Parentheses | Easy |
| Contains Duplicate | Easy |
| Valid Anagram | Easy |
| Binary Search | Easy |
| Climbing Stairs | Easy |
| Maximum Subarray | Medium |
| Product of Array Except Self | Medium |
| Longest Substring Without Repeating Characters | Medium |
| Group Anagrams | Medium |
| Top K Frequent Elements | Medium |
| Merge Intervals | Medium |
| Number of Islands | Medium |
| Coin Change | Medium |

Most test suites include at least one large input, so a brute-force solution that would time out in an interview will feel slow here too.

`/q/<problem-slug>` starts a new session on that problem, for example `/q/two-sum`. Session links look like `/s/<session-id>/<problem-slug>`, and anyone with the link joins the same pad.

## Running it locally

```bash
npm install
npm run dev
```

This starts Next.js on port 3000 and a small sync server on port 1234. Open http://localhost:3000 and start a session. To see live editing, open the same link in a second window, or on another device on your network at `http://<your-LAN-IP>:3000/...`.

## How it works

```
 Browser A ──┐                         ┌── Browser B
  CodeMirror 6 + y-codemirror.next      CodeMirror 6 + y-codemirror.next
  Y.Doc (CRDT) ◄──── sync provider ────► Y.Doc (CRDT)
  Pyodide worker                        Pyodide worker
```

Each session is a [Yjs](https://yjs.dev) document. Code for each problem is stored under `code:<slug>`, the last run's output under `run:<slug>`, and the current problem under `meta`. Cursors and presence go through Yjs awareness.

For syncing, local dev uses a small `y-websocket` server (`server/sync-server.mjs`). Vercel functions can't hold a WebSocket open, so the deployed version uses [Liveblocks](https://liveblocks.io) instead, which hosts Yjs rooms and has a free tier. If you'd rather host your own server, deploy `npm run sync-server` anywhere and set `NEXT_PUBLIC_YJS_WS_URL`. If no sync backend is reachable, the app falls back to single-user mode.

All code runs on the client, which keeps the server simple. It also means there's no server-side sandbox, so don't treat this as a secure place to run code from strangers.

## Deploying to Vercel

1. Make a free Liveblocks account and copy your **public** key (it starts with `pk_`) from https://liveblocks.io/dashboard/apikeys.
2. Import the repo at https://vercel.com/new. Vercel detects Next.js automatically.
3. Set `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_...` and deploy.

You can also put the key in `.env.local` to use Liveblocks during local dev. When it's set, the local sync server isn't used. See `.env.example` for both options.

## Adding a problem

Problems live in `lib/questions.ts`. Add an object to `QUESTIONS` with:

- `description`: Markdown shown in the left panel
- `starter`: the code the editor starts with
- `tests`: Python that defines `CASES = [{"name", "func", "args", "expected"}, ...]`

If a problem has more than one correct answer (any order, any valid index, and so on), leave out `expected` and define `check(case, got) -> (ok, description)` instead. Two Sum and Group Anagrams both work this way.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server plus the local sync server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run sync-server` | Only the Yjs WebSocket server (reads `PORT` and `HOST`) |
| `npm run typecheck` | TypeScript check |
