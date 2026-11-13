"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Prec } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { yCollab } from "y-codemirror.next";

type Props = {
  ytext: Y.Text;
  awareness: Awareness;
  onRun: () => void;
  onTest: () => void;
};

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "14px", backgroundColor: "var(--editor-bg)" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono), ui-monospace, Menlo, monospace",
    lineHeight: "1.6",
    fontVariantLigatures: "none",
  },
  ".cm-gutters": { backgroundColor: "var(--editor-bg)", borderRight: "1px solid var(--border)" },
  ".cm-content": { paddingBottom: "40vh" },
  // remote cursor name labels from y-codemirror.next
  ".cm-ySelectionInfo": {
    opacity: "1",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    fontSize: "11px",
    fontWeight: "600",
    padding: "1px 4px",
    borderRadius: "3px 3px 3px 0",
    color: "#111",
    top: "-1.25em",
  },
});

export default function CollabEditor({ ytext, awareness, onRun, onTest }: Props) {
  const host = useRef<HTMLDivElement>(null);
  // keep latest callbacks without recreating the editor
  const cb = useRef({ onRun, onTest });
  cb.current = { onRun, onTest };

  useEffect(() => {
    if (!host.current) return;
    const undoManager = new Y.UndoManager(ytext);
    const runKeys = Prec.highest(
      keymap.of([
        { key: "Mod-Enter", run: () => (cb.current.onRun(), true) },
        { key: "Mod-Shift-Enter", run: () => (cb.current.onTest(), true) },
        { key: "Mod-'", run: () => (cb.current.onTest(), true) },
      ]),
    );
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: ytext.toString(),
        extensions: [
          runKeys,
          basicSetup,
          keymap.of([indentWithTab]),
          EditorState.tabSize.of(4),
          python(),
          oneDark,
          theme,
          yCollab(ytext, awareness, { undoManager }),
        ],
      }),
    });
    view.focus();
    return () => {
      view.destroy();
      undoManager.destroy();
    };
  }, [ytext, awareness]);

  return <div ref={host} className="editor-host" />;
}
