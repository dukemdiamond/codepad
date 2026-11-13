// Main-thread wrapper around public/py-worker.js.
// One worker is kept warm; Stop or a timeout terminates it and boots a fresh one.

export type TestResult = {
  name: string;
  input: string;
  passed: boolean;
  expected?: string;
  got?: string;
  error?: string;
  ms?: number;
};

export type RunDone = {
  ok: boolean;
  error?: string;
  results: TestResult[] | null;
  ms: number;
  timedOut?: boolean;
  stopped?: boolean;
};

type Handlers = {
  onStdout: (text: string) => void;
  onStderr: (text: string) => void;
};

export const RUN_TIMEOUT_MS = 10_000;

export class PyRunner {
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;
  private current: { resolve: (d: RunDone) => void; timer: ReturnType<typeof setTimeout>; handlers: Handlers } | null = null;
  onStatus: (s: "loading" | "ready" | "error") => void = () => {};

  boot() {
    if (this.worker) return this.readyPromise!;
    this.onStatus("loading");
    const w = new Worker("/py-worker.js");
    this.worker = w;
    this.readyPromise = new Promise((resolve, reject) => {
      w.onmessage = (ev: MessageEvent) => {
        const m = ev.data;
        if (m.type === "ready") {
          this.onStatus("ready");
          resolve();
        } else if (m.type === "fatal") {
          this.onStatus("error");
          reject(new Error(m.error));
        } else if (m.type === "stdout") {
          this.current?.handlers.onStdout(m.data);
        } else if (m.type === "stderr") {
          this.current?.handlers.onStderr(m.data);
        } else if (m.type === "done") {
          this.finish({ ok: m.ok, error: m.error, results: m.results ?? null, ms: m.ms });
        }
      };
      w.onerror = (e) => {
        this.onStatus("error");
        reject(new Error(e.message || "Python worker failed to load"));
      };
    });
    this.readyPromise.catch(() => {});
    return this.readyPromise;
  }

  get busy() {
    return this.current !== null;
  }

  async run(mode: "run" | "test", code: string, tests: string, handlers: Handlers): Promise<RunDone> {
    if (this.current) throw new Error("Already running");
    await this.boot();
    return new Promise<RunDone>((resolve) => {
      const timer = setTimeout(() => this.kill({ timedOut: true }), RUN_TIMEOUT_MS);
      this.current = { resolve, timer, handlers };
      this.worker!.postMessage({ type: mode, code, tests });
    });
  }

  stop() {
    this.kill({ stopped: true });
  }

  private kill(flags: { timedOut?: boolean; stopped?: boolean }) {
    if (!this.current) return;
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
    const msg = flags.timedOut
      ? `Execution timed out after ${RUN_TIMEOUT_MS / 1000}s (infinite loop or too slow?)`
      : "Execution stopped";
    this.finish({ ok: false, error: msg, results: null, ms: 0, ...flags });
    this.boot(); // warm a fresh interpreter for the next run
  }

  private finish(d: RunDone) {
    const c = this.current;
    if (!c) return;
    clearTimeout(c.timer);
    this.current = null;
    c.resolve(d);
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
  }
}
