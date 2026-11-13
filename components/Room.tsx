"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import CollabEditor from "./CollabEditor";
import { connect, pickColor, randomId, syncMisconfigured, type SyncConnection } from "@/lib/sync";
import { PyRunner, type TestResult } from "@/lib/pyRunner";

export type QuestionView = {
  slug: string;
  title: string;
  difficulty: string;
  tags: string[];
  html: string;
  starter: string;
  tests: string;
};

type Peer = { clientId: number; name: string; color: string; q?: string; self: boolean };

type RunState = {
  status: "idle" | "running" | "done";
  mode?: "run" | "test";
  by?: string;
  byColor?: string;
  stdout?: string;
  error?: string;
  results?: TestResult[] | null;
  ms?: number;
  at?: number;
};

const MAX_OUT = 20_000;
const NAME_KEY = "codepad:name";

function readRun(m: Y.Map<unknown>): RunState {
  const status = (m.get("status") as RunState["status"]) || "idle";
  let results: TestResult[] | null = null;
  const raw = m.get("results");
  if (typeof raw === "string" && raw) {
    try {
      results = JSON.parse(raw);
    } catch {}
  }
  return {
    status,
    mode: m.get("mode") as RunState["mode"],
    by: m.get("by") as string,
    byColor: m.get("byColor") as string,
    stdout: (m.get("stdout") as string) || "",
    error: (m.get("error") as string) || "",
    results,
    ms: m.get("ms") as number,
    at: m.get("at") as number,
  };
}

export default function Room({
  room,
  initialSlug,
  questions,
}: {
  room: string;
  initialSlug: string;
  questions: QuestionView[];
}) {
  const [conn, setConn] = useState<SyncConnection | null>(null);
  const [synced, setSynced] = useState(false);
  const [online, setOnline] = useState(false);
  const [slug, setSlug] = useState(initialSlug);
  const [name, setName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [pyStatus, setPyStatus] = useState<"loading" | "ready" | "error">("loading");
  const [run, setRun] = useState<RunState>({ status: "idle" });
  const [tab, setTab] = useState<"console" | "tests">("console");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [iAmRunning, setIAmRunning] = useState(false);
  const [misconfigured, setMisconfigured] = useState(false);
  useEffect(() => setMisconfigured(syncMisconfigured()), []);
  const [leftW, setLeftW] = useState(40); // % of width
  const [outH, setOutH] = useState(34); // % of right column height
  const runner = useRef<PyRunner | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const q = questions.find((x) => x.slug === slug) ?? questions[0];
  const color = useMemo(() => pickColor(name ?? "anon"), [name]);

  // ---- identity -----------------------------------------------------------
  useEffect(() => {
    let n: string | null = null;
    try {
      n = localStorage.getItem(NAME_KEY);
    } catch {}
    if (n) setName(n);
    else setNameDraft(`Guest ${randomId(3).toUpperCase()}`);
  }, []);

  // ---- connection ---------------------------------------------------------
  useEffect(() => {
    let alive = true;
    let c: SyncConnection | null = null;
    connect(room).then((conn) => {
      if (!alive) return conn.destroy();
      c = conn;
      setConn(conn);
      conn.onStatus(setOnline);
      conn.onSynced(() => alive && setSynced(true));
    });
    return () => {
      alive = false;
      c?.destroy();
    };
  }, [room]);

  // ---- python runner -----------------------------------------------------
  useEffect(() => {
    const r = new PyRunner();
    r.onStatus = setPyStatus;
    r.boot();
    runner.current = r;
    return () => r.destroy();
  }, []);

  // ---- awareness (presence + cursor identity) ----------------------------
  useEffect(() => {
    if (!conn || !name) return;
    const aw = conn.awareness;
    aw.setLocalStateField("user", { name, color, colorLight: color + "33" });
    aw.setLocalStateField("q", slug);
  }, [conn, name, color, slug]);

  useEffect(() => {
    if (!conn) return;
    const aw = conn.awareness;
    const update = () => {
      const list: Peer[] = [];
      aw.getStates().forEach((s: any, clientId: number) => {
        if (!s?.user?.name) return;
        list.push({ clientId, name: s.user.name, color: s.user.color, q: s.q, self: clientId === aw.clientID });
      });
      list.sort((a, b) => Number(b.self) - Number(a.self) || a.name.localeCompare(b.name));
      setPeers(list);
    };
    update();
    aw.on("change", update);
    return () => aw.off("change", update);
  }, [conn]);

  // ---- shared "current question": switching moves everyone in the room ----
  const navigate = useCallback(
    (next: string, push = true) => {
      setSlug(next);
      const path = `/s/${room}/${next}`;
      if (push && location.pathname !== path) history.pushState(null, "", path);
    },
    [room],
  );

  useEffect(() => {
    if (!conn || !synced) return;
    const meta = conn.doc.getMap<unknown>("meta");
    const onChange = (e: Y.YMapEvent<unknown>) => {
      if (!e.keysChanged.has("question")) return;
      const nq = meta.get("question") as string;
      if (nq && nq !== slugRef.current && questions.some((x) => x.slug === nq)) {
        const by = meta.get("questionBy") as string;
        navigate(nq);
        const t = questions.find((x) => x.slug === nq)?.title;
        if (by && by !== nameRef.current) flash(`${by} switched to “${t}”`);
      }
    };
    meta.observe(onChange);
    return () => meta.unobserve(onChange);
  }, [conn, synced, navigate, questions]);

  const slugRef = useRef(slug);
  slugRef.current = slug;
  const nameRef = useRef(name);
  nameRef.current = name;

  const chooseQuestion = (next: string) => {
    if (next === slug) return;
    navigate(next);
    if (conn) {
      const meta = conn.doc.getMap<unknown>("meta");
      conn.doc.transact(() => {
        meta.set("question", next);
        meta.set("questionBy", name ?? "Someone");
      });
    }
  };

  useEffect(() => {
    const onPop = () => {
      const parts = location.pathname.split("/");
      const s = parts[3];
      if (s && questions.some((x) => x.slug === s)) setSlug(s);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [questions]);

  // ---- seed starter code once per question per room ----------------------
  useEffect(() => {
    if (!conn || !synced) return;
    const ytext = conn.doc.getText(`code:${slug}`);
    const meta = conn.doc.getMap<unknown>("meta");
    if (ytext.length === 0 && !meta.get(`init:${slug}`)) {
      conn.doc.transact(() => {
        ytext.insert(0, q.starter);
        meta.set(`init:${slug}`, true);
      });
    }
  }, [conn, synced, slug, q.starter]);

  // ---- shared run output ---------------------------------------------------
  const runMap = useMemo(() => conn?.doc.getMap<unknown>(`run:${slug}`) ?? null, [conn, slug]);
  useEffect(() => {
    if (!runMap) return;
    const update = () => setRun(readRun(runMap));
    update();
    runMap.observe(update);
    return () => runMap.unobserve(update);
  }, [runMap]);

  const ytext = useMemo(() => conn?.doc.getText(`code:${slug}`) ?? null, [conn, slug]);

  const execute = useCallback(
    async (mode: "run" | "test") => {
      const r = runner.current;
      if (!r || !conn || !runMap || !ytext || r.busy) return;
      const code = ytext.toString();
      const tests = q.tests;
      let buf = "";
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const flush = () => {
        flushTimer = null;
        runMap.set("stdout", buf.length > MAX_OUT ? buf.slice(0, MAX_OUT) + "\n… output truncated …" : buf);
      };
      const append = (s: string) => {
        if (buf.length > MAX_OUT + 10) return;
        buf += s;
        if (!flushTimer) flushTimer = setTimeout(flush, 80);
      };
      conn.doc.transact(() => {
        runMap.set("status", "running");
        runMap.set("mode", mode);
        runMap.set("by", name ?? "Someone");
        runMap.set("byColor", color);
        runMap.set("stdout", "");
        runMap.set("error", "");
        runMap.set("results", "");
        runMap.set("at", Date.now());
      });
      setTab(mode === "test" ? "tests" : "console");
      setIAmRunning(true);
      const done = await r.run(mode, code, tests, { onStdout: append, onStderr: append }).finally(() =>
        setIAmRunning(false),
      );
      if (flushTimer) clearTimeout(flushTimer);
      conn.doc.transact(() => {
        flush();
        runMap.set("status", "done");
        runMap.set("error", done.error ?? "");
        runMap.set("results", done.results ? JSON.stringify(done.results) : "");
        runMap.set("ms", done.ms);
        runMap.set("at", Date.now());
      });
      if (mode === "test" && !done.results) setTab("console");
    },
    [conn, runMap, ytext, q.tests, name, color],
  );

  // other people's runs pull the output panel to the right tab
  const lastAt = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (run.status === "running" && run.at !== lastAt.current) {
      lastAt.current = run.at;
      setTab(run.mode === "test" ? "tests" : "console");
    }
    if (run.status === "done" && run.mode === "test" && !run.results) setTab("console");
  }, [run.status, run.at, run.mode, run.results]);

  const resetCode = () => {
    if (!ytext || !conn) return;
    if (!confirm("Reset the editor to the starter code for everyone in this room?")) return;
    conn.doc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, q.starter);
    });
  };

  const clearOutput = () => {
    if (!runMap || !conn) return;
    conn.doc.transact(() => {
      for (const k of ["status", "stdout", "error", "results", "ms", "by", "mode"]) runMap.delete(k);
    });
  };

  // ---- misc UI -------------------------------------------------------------
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt("Copy this link:", location.href);
    }
  };

  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    const n = nameDraft.trim().slice(0, 24);
    if (!n) return;
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {}
    setName(n);
  };

  const startDrag = (kind: "x" | "y") => (e: React.PointerEvent) => {
    e.preventDefault();
    const el = kind === "x" ? bodyRef.current : rightRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      if (kind === "x") setLeftW(Math.min(70, Math.max(18, ((ev.clientX - rect.left) / rect.width) * 100)));
      else setOutH(Math.min(80, Math.max(12, ((rect.bottom - ev.clientY) / rect.height) * 100)));
    };
    const up = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      document.body.classList.remove("dragging");
    };
    document.body.classList.add("dragging");
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  };

  const running = run.status === "running" && (run.at ?? 0) > Date.now() - 20_000;
  const passed = run.results?.filter((r) => r.passed).length ?? 0;
  const total = run.results?.length ?? 0;

  return (
    <div className="app">
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-mark">{"</>"}</span> CodePad
        </a>
        <nav className="qtabs">
          {questions.map((x) => {
            const here = peers.filter((p) => !p.self && p.q === x.slug);
            return (
              <button
                key={x.slug}
                className={`qtab ${x.slug === slug ? "active" : ""}`}
                onClick={() => chooseQuestion(x.slug)}
                title={x.title}
              >
                <span className={`dot diff-${x.difficulty.toLowerCase()}`} />
                <span className="qtab-title">{x.title}</span>
                {here.map((p) => (
                  <span key={p.clientId} className="mini-avatar" style={{ background: p.color }} title={p.name}>
                    {p.name[0]?.toUpperCase()}
                  </span>
                ))}
              </button>
            );
          })}
        </nav>
        <div className="topbar-right">
          <div className="peers">
            {peers.map((p) => (
              <span
                key={p.clientId}
                className="avatar"
                style={{ background: p.color }}
                title={p.self ? `${p.name} (you)` : p.name}
              >
                {p.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
          <span className={`conn ${online ? "on" : "off"}`} title={conn?.backend === "liveblocks" ? "Liveblocks" : "WebSocket"}>
            {online ? "Live" : "Connecting…"}
          </span>
          <button className="btn ghost" onClick={copyLink}>
            {copied ? "Copied!" : "Copy invite link"}
          </button>
        </div>
      </header>

      {misconfigured && (
        <div className="banner">
          Realtime sync isn&apos;t configured for this deployment. Set <code>NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY</code> in
          your Vercel project&apos;s environment variables and redeploy (see README).
        </div>
      )}

      <div className="body" ref={bodyRef}>
        <section className="question" style={{ width: `${leftW}%` }}>
          <div className="question-head">
            <h1>{q.title}</h1>
            <div className="meta">
              <span className={`pill diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
              {q.tags.map((t) => (
                <span key={t} className="pill tag">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <article className="prose" dangerouslySetInnerHTML={{ __html: q.html }} />
        </section>

        <div className="splitter-x" onPointerDown={startDrag("x")} />

        <section className="right" ref={rightRef}>
          <div className="toolbar">
            <span className="file">solution.py</span>
            <span className="py-status">
              {pyStatus === "loading" ? "Loading Python…" : pyStatus === "error" ? "Python failed to load" : "Python 3 ready"}
            </span>
            <div className="spacer" />
            <button className="btn ghost small" onClick={resetCode} disabled={!synced}>
              Reset
            </button>
            {iAmRunning ? (
              <button className="btn danger" onClick={() => runner.current?.stop()}>
                ■ Stop
              </button>
            ) : (
              <>
                <button className="btn" onClick={() => execute("run")} disabled={!synced} title="⌘/Ctrl + Enter">
                  ▶ Run
                </button>
                <button
                  className="btn primary"
                  onClick={() => execute("test")}
                  disabled={!synced}
                  title="⌘/Ctrl + Shift + Enter"
                >
                  ✓ Run tests
                </button>
              </>
            )}
          </div>

          <div className="editor-wrap" style={{ height: `${100 - outH}%` }}>
            {conn && synced && ytext ? (
              <CollabEditor
                key={slug}
                ytext={ytext}
                awareness={conn.awareness}
                onRun={() => execute("run")}
                onTest={() => execute("test")}
              />
            ) : (
              <div className="placeholder">Connecting to room…</div>
            )}
          </div>

          <div className="splitter-y" onPointerDown={startDrag("y")} />

          <div className="output" style={{ height: `${outH}%` }}>
            <div className="output-tabs">
              <button className={tab === "console" ? "active" : ""} onClick={() => setTab("console")}>
                Console
              </button>
              <button className={tab === "tests" ? "active" : ""} onClick={() => setTab("tests")}>
                Tests
                {total > 0 && (
                  <span className={`count ${passed === total ? "ok" : "bad"}`}>
                    {passed}/{total}
                  </span>
                )}
              </button>
              <div className="spacer" />
              {run.by && (
                <span className="run-by">
                  <span className="mini-avatar" style={{ background: run.byColor }}>
                    {run.by[0]?.toUpperCase()}
                  </span>
                  {running ? `${run.by} is running…` : `${run.mode === "test" ? "Tests" : "Run"} by ${run.by}`}
                  {!running && run.ms != null && run.ms > 0 && ` · ${run.ms} ms`}
                </span>
              )}
              <button className="btn ghost small" onClick={clearOutput}>
                Clear
              </button>
            </div>

            <div className="output-body">
              {tab === "console" ? (
                <pre className="console">
                  {run.status === "idle" && !run.stdout && (
                    <span className="muted">Press ▶ Run (⌘/Ctrl+Enter) — output is shared with everyone in the room.</span>
                  )}
                  {run.stdout}
                  {run.error && <span className="err">{run.error}</span>}
                  {run.status === "done" && !run.error && !run.stdout && run.mode === "run" && (
                    <span className="muted">(no output)</span>
                  )}
                </pre>
              ) : (
                <TestsView run={run} running={running} />
              )}
            </div>
          </div>
        </section>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {name === null && nameDraft !== "" && (
        <div className="modal-bg">
          <form className="modal" onSubmit={saveName}>
            <h2>Join session</h2>
            <p className="muted">Your name is shown next to your cursor.</p>
            <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={24} />
            <button className="btn primary" type="submit">
              Join
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function TestsView({ run, running }: { run: RunState; running: boolean }) {
  if (running && run.mode === "test") return <div className="muted pad">Running tests…</div>;
  if (!run.results) return <div className="muted pad">Press ✓ Run tests to check the solution against the test cases.</div>;
  return (
    <div className="tests">
      {run.results.map((r, i) => (
        <details key={i} className={`test ${r.passed ? "pass" : "fail"}`} open={!r.passed && i < 50}>
          <summary>
            <span className="icon">{r.passed ? "✓" : "✗"}</span>
            <span className="tname">{r.name}</span>
            {r.ms != null && <span className="ms">{r.ms} ms</span>}
          </summary>
          <div className="tdetail">
            <div>
              <b>Input</b> <code>{r.input}</code>
            </div>
            {r.error ? (
              <pre className="err">{r.error}</pre>
            ) : (
              <>
                <div>
                  <b>Expected</b> <code>{r.expected}</code>
                </div>
                <div>
                  <b>Got</b> <code>{r.got}</code>
                </div>
              </>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
