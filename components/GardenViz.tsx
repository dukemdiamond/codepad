"use client";

import { useEffect, useMemo, useState } from "react";
import type * as Y from "yjs";

// Interactive visualizer for the Garden Watering question.
// Planters are drawn at their height (taller = higher), so water visibly runs downhill.
// State (graph / part / source) is shared through a Y.Map so everyone in the room sees the same view.

type Garden = { id: string; label: string; A: number[][]; H: number[]; x: number[]; note: string };

const GARDENS: Garden[] = [
  {
    id: "example",
    label: "Example",
    A: [[1], [0, 2], [1, 3], [2, 4], [3], [6, 7, 8], [5], [5], [5]],
    H: [5, 4, 3, 2, 1, 2, 1, 1, 1],
    x: [0, 1, 2, 3, 4, 6.2, 5.3, 6.2, 7.1],
    note: "A descending chain vs. a hub. Part 1 and Part 2 pick different planters.",
  },
  {
    id: "diamond",
    label: "Diamond",
    A: [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3]],
    H: [10, 6, 5, 2, 1],
    x: [1, 0, 2, 1, 1.8],
    note: "Two paths reach planter 3. It must be counted once (unique planters).",
  },
  {
    id: "hillside",
    label: "Hillside",
    A: [
      [1, 2], [0, 3, 4, 8], [0, 5], [1, 4], [1, 3], [2, 6, 7], [5], [5],
      [1, 9, 10, 11, 12], [8, 10], [8, 9], [8], [8],
    ],
    H: [9, 7, 8, 4, 4, 3, 2, 1, 6, 5, 5, 1, 2],
    x: [3, 1.9, 4.8, 0.8, 2.3, 5.4, 4.8, 6, 3.4, 2.5, 4.3, 3.0, 3.9],
    note: "Equal heights (3–4, 9–10) don't share water. The peak reaches everything in Part 2.",
  },
];

type Part = 1 | 2;

/** Returns watered planters with BFS depth, plus the edges water flowed along. */
function water(g: Garden, src: number, part: Part) {
  const depth = new Map<number, number>([[src, 0]]);
  const flows: [number, number, number][] = []; // u, v, depth of u
  const queue = [src];
  while (queue.length) {
    const u = queue.shift()!;
    const d = depth.get(u)!;
    if (part === 1 && d > 0) continue;
    for (const v of g.A[u]) {
      if (g.H[v] < g.H[u]) {
        flows.push([u, v, d]);
        if (!depth.has(v)) {
          depth.set(v, d + 1);
          queue.push(v);
        }
      }
    }
  }
  return { depth, flows };
}

const W = 560;
const PAD_L = 46;
const PAD_R = 24;
const TOP = 26;
const R = 15;

export default function GardenViz({ shared }: { shared: Y.Map<unknown> | null }) {
  const [local, setLocal] = useState<{ g: string; part: Part; src: number | null; best: boolean }>({
    g: "example",
    part: 1,
    src: null,
    best: false,
  });

  useEffect(() => {
    if (!shared) return;
    const read = () =>
      setLocal((s) => ({
        g: (shared.get("g") as string) ?? s.g,
        part: ((shared.get("part") as Part) ?? s.part) as Part,
        src: shared.has("src") ? (shared.get("src") as number | null) : s.src,
        best: (shared.get("best") as boolean) ?? s.best,
      }));
    read();
    shared.observe(read);
    return () => shared.unobserve(read);
  }, [shared]);

  const set = (patch: Partial<typeof local>) => {
    setLocal((s) => ({ ...s, ...patch }));
    if (shared) {
      shared.doc?.transact(() => {
        for (const [k, v] of Object.entries(patch)) shared.set(k, v);
      });
    }
  };

  const g = GARDENS.find((x) => x.id === local.g) ?? GARDENS[0];
  const { part, src, best } = local;

  const layout = useMemo(() => {
    const maxH = Math.max(...g.H);
    const minH = Math.min(...g.H);
    const levels = maxH - minH || 1;
    const rowH = Math.max(32, Math.min(48, 300 / levels));
    const height = TOP + levels * rowH + 46;
    const minX = Math.min(...g.x);
    const spanX = Math.max(...g.x) - minX || 1;
    const px = (i: number) => PAD_L + R + 8 + ((g.x[i] - minX) / spanX) * (W - PAD_L - PAD_R - 2 * R - 16);
    const py = (h: number) => TOP + (maxH - h) * rowH + R;
    const edges: [number, number][] = [];
    g.A.forEach((ns, u) => ns.forEach((v) => u < v && edges.push([u, v])));
    const ticks = Array.from({ length: levels + 1 }, (_, k) => minH + k);
    return { px, py, height, edges, ticks };
  }, [g]);

  const counts = useMemo(() => g.H.map((_, i) => water(g, i, part).depth.size), [g, part]);
  const bestCount = Math.max(...counts);
  const result = src != null && src < g.H.length ? water(g, src, part) : null;
  const flowSet = new Map(result?.flows.map(([u, v, d]) => [`${u}-${v}`, d]) ?? []);

  return (
    <div className="viz">
      <div className="viz-controls">
        <div className="seg">
          {GARDENS.map((x) => (
            <button key={x.id} className={x.id === g.id ? "on" : ""} onClick={() => set({ g: x.id, src: null })}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="seg">
          {([1, 2] as Part[]).map((p) => (
            <button key={p} className={p === part ? "on" : ""} onClick={() => set({ part: p })}>
              Part {p}
            </button>
          ))}
        </div>
        <label className="viz-check">
          <input type="checkbox" checked={best} onChange={(e) => set({ best: e.target.checked })} /> Reveal counts
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${layout.height}`} className="viz-svg" role="img" aria-label={`${g.label} garden graph`}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--water)" />
          </marker>
        </defs>

        {/* height axis */}
        <text x={10} y={14} className="viz-axis-label">height</text>
        {layout.ticks.map((h) => (
          <g key={h}>
            <line x1={PAD_L - 4} x2={W - 8} y1={layout.py(h)} y2={layout.py(h)} className="viz-grid" />
            <text x={PAD_L - 10} y={layout.py(h) + 4} className="viz-tick" textAnchor="end">
              {h}
            </text>
          </g>
        ))}

        {/* edges */}
        {layout.edges.map(([a, b]) => {
          const hi = g.H[a] >= g.H[b] ? a : b;
          const lo = hi === a ? b : a;
          const d = flowSet.get(`${hi}-${lo}`);
          const flowing = d !== undefined;
          const x1 = layout.px(hi), y1 = layout.py(g.H[hi]), x2 = layout.px(lo), y2 = layout.py(g.H[lo]);
          const len = Math.hypot(x2 - x1, y2 - y1) || 1;
          const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
          return (
            <line
              key={`${a}-${b}-${flowing}`}
              x1={x1 + ux * R}
              y1={y1 + uy * R}
              x2={x2 - ux * (R + 2)}
              y2={y2 - uy * (R + 2)}
              className={`viz-edge ${flowing ? "flow" : ""} ${g.H[a] === g.H[b] ? "flat" : ""}`}
              markerEnd={flowing ? "url(#arrow)" : undefined}
              style={flowing ? { animationDelay: `${d! * 220}ms` } : undefined}
            />
          );
        })}

        {/* planters */}
        {g.H.map((h, i) => {
          const x = layout.px(i), y = layout.py(h);
          const d = result?.depth.get(i);
          const wet = d !== undefined;
          const isBest = best && counts[i] === bestCount;
          return (
            <g
              key={`${g.id}-${i}-${src}-${part}`}
              className={`viz-node ${wet ? "wet" : ""} ${i === src ? "src" : ""} ${isBest ? "best" : ""}`}
              style={wet ? { animationDelay: `${d! * 220}ms` } : undefined}
              onClick={() => set({ src: i === src ? null : i })}
            >
              <circle cx={x} cy={y} r={R} />
              <text x={x} y={y + 4.5} textAnchor="middle" className="viz-idx">
                {i}
              </text>
              {best && (
                <text x={x + R + 3} y={y - R + 4} className="viz-count">
                  {counts[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="viz-status">
        {result ? (
          <>
            <span className="drop">💧</span> Watering <b>planter {src}</b> (height {g.H[src!]}) waters{" "}
            <b>{result.depth.size}</b> planter{result.depth.size === 1 ? "" : "s"}
            {result.depth.size === bestCount ? <span className="ok"> · optimal</span> : <span className="muted"> · best is {bestCount}</span>}
          </>
        ) : (
          <span className="muted">Click a planter to water it. {g.note}</span>
        )}
      </div>
      <div className="viz-code">
        <code>A = {JSON.stringify(g.A)}</code>
        <code>H = {JSON.stringify(g.H)}</code>
      </div>
    </div>
  );
}
