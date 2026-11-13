/* Python runner: Pyodide (CPython compiled to WebAssembly) inside a Web Worker.
 * The main thread can terminate this worker at any time (Stop / timeout), which
 * is the most reliable way to kill runaway code like `while True: pass`.
 */
const PYODIDE_VERSION = "0.29.5";
importScripts(`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`);

const HARNESS = `
import json, time, traceback, copy, sys, linecache

def _short(s, n=300):
    return s if len(s) <= n else s[: n - 3] + "..."

def _user_tb():
    # Only show frames from the user's file, not the harness.
    etype, value, tb = sys.exc_info()
    frames = [f for f in traceback.extract_tb(tb) if f.filename == "solution.py"]
    lines = ["Traceback (most recent call last):\\n"] if frames else []
    lines += traceback.format_list(frames)
    lines += traceback.format_exception_only(etype, value)
    return "".join(lines)

def _exec_user(code, as_main):
    ns = {"__name__": "__main__" if as_main else "solution"}
    linecache.cache["solution.py"] = (len(code), None, code.splitlines(True), "solution.py")
    exec(compile(code, "solution.py", "exec"), ns)
    return ns

def _run_tests(ns, tests_src):
    tns = {}
    exec(compile(tests_src, "tests.py", "exec"), tns)
    cases, check = tns["CASES"], tns.get("check")
    results = []
    for c in cases:
        r = {"name": c["name"], "input": _short(", ".join(repr(a) for a in c["args"]), 160)}
        fn = ns.get(c["func"])
        if not callable(fn):
            r.update(passed=False, error=f"Function '{c['func']}' is not defined")
            results.append(r)
            continue
        t0 = time.perf_counter()
        try:
            got = fn(*copy.deepcopy(c["args"]))
            r["ms"] = round((time.perf_counter() - t0) * 1000, 2)
            if check:
                ok, exp = check(c, got)
            else:
                ok, exp = got == c["expected"] and type(got) == type(c["expected"]), repr(c["expected"])
            r.update(passed=bool(ok), expected=_short(str(exp)), got=_short(repr(got)))
        except Exception:
            r["ms"] = round((time.perf_counter() - t0) * 1000, 2)
            r.update(passed=False, error=_user_tb())
        results.append(r)
    return results

def _main(code, tests_src, mode):
    try:
        ns = _exec_user(code, mode == "run")
    except BaseException as e:
        if isinstance(e, SystemExit):
            return json.dumps({"ok": True, "results": None})
        return json.dumps({"ok": False, "error": _user_tb()})
    if mode != "test":
        return json.dumps({"ok": True, "results": None})
    try:
        return json.dumps({"ok": True, "results": _run_tests(ns, tests_src)})
    except Exception:
        return json.dumps({"ok": False, "error": traceback.format_exc()})
`;

let pyodide = null;

async function init() {
  pyodide = await loadPyodide();
  pyodide.setStdout({ batched: (s) => postMessage({ type: "stdout", data: s + "\n" }) });
  pyodide.setStderr({ batched: (s) => postMessage({ type: "stderr", data: s + "\n" }) });
  pyodide.setStdin({ stdin: () => null, isatty: false });
  pyodide.runPython(HARNESS);
  postMessage({ type: "ready", version: pyodide.version });
}

const ready = init().catch((e) => postMessage({ type: "fatal", error: String(e) }));

self.onmessage = async (ev) => {
  const { type, code, tests } = ev.data;
  await ready;
  if (!pyodide) return;
  const t0 = performance.now();
  try {
    const out = JSON.parse(pyodide.globals.get("_main")(code, tests || "", type));
    postMessage({ type: "done", ...out, ms: Math.round(performance.now() - t0) });
  } catch (e) {
    postMessage({ type: "done", ok: false, error: String(e), ms: Math.round(performance.now() - t0) });
  }
};
