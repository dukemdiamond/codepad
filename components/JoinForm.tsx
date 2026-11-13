"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinForm() {
  const [v, setV] = useState("");
  const router = useRouter();
  return (
    <form
      className="join"
      onSubmit={(e) => {
        e.preventDefault();
        const raw = v.trim();
        if (!raw) return;
        // accept a full URL or just the session code
        const m = raw.match(/\/s\/([A-Za-z0-9_-]+)(\/[A-Za-z0-9_-]+)?/);
        router.push(m ? `/s/${m[1]}${m[2] ?? ""}` : `/s/${raw.replace(/[^A-Za-z0-9_-]/g, "")}`);
      }}
    >
      <input placeholder="Session code or link" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn" type="submit">
        Join
      </button>
    </form>
  );
}
