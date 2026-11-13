import Link from "next/link";
import { QUESTIONS } from "@/lib/questions";
import JoinForm from "@/components/JoinForm";

export default function Home() {
  return (
    <main className="home">
      <div className="home-inner">
        <div className="brand big">
          <span className="brand-mark">{"</>"}</span> CodePad
        </div>
        <p className="lead">
          A shared Python pad for interviews and pair practice. Everyone in a session sees each other&apos;s typing and
          cursors live, and code runs right in the browser.
        </p>

        <div className="home-actions">
          <Link className="btn primary lg" href={`/q/${QUESTIONS[0].slug}`}>
            Start a new session
          </Link>
          <JoinForm />
        </div>

        <h2 className="section-title">Questions</h2>
        <div className="cards">
          {QUESTIONS.map((q) => (
            <Link key={q.slug} href={`/q/${q.slug}`} className="card">
              <div className="card-top">
                <span className={`pill diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                {q.tags.map((t) => (
                  <span key={t} className="pill tag">
                    {t}
                  </span>
                ))}
              </div>
              <div className="card-title">{q.title}</div>
              <div className="card-link">/q/{q.slug} →</div>
            </Link>
          ))}
        </div>
        <p className="muted small-note">
          Each link starts a private session. Share the session URL (it looks like <code>/s/abc123/…</code>) so others
          can join. You can switch questions inside a session and everyone follows.
        </p>
      </div>
    </main>
  );
}
