"use client";

import { useState } from "react";

type Status = "pass" | "fail" | "check" | "error";
type Check = { id: string; group: "Timing" | "Repository" | "Video"; status: Status; title: string; found: string; rule?: string };
type Criterion = { name: string; question: string };
type Result = {
  event: { title: string; url: string; rulesUrl: string; deadline: string | null; periodStart: string | null; rulesFound: boolean };
  summary: Record<Status, number>;
  checks: Check[];
  criteria: { rules: Criterion[]; overview: Criterion[]; mismatch: string | null };
  eligibility: string[];
};
type FieldError = { field: string; message: string };

const EXAMPLES = [
  { label: "A submitted entry", hackathon: "https://amazonappdev2026.devpost.com", repo: "https://github.com/Joe-Simo/larder", video: "https://youtu.be/6batpP1Hhv0" },
  { label: "Same repo, different event", hackathon: "https://learn-ai-basics.devpost.com", repo: "https://github.com/Joe-Simo/larder", video: "https://youtu.be/6batpP1Hhv0" },
  { label: "This project", hackathon: "https://learn-ai-basics.devpost.com", repo: "https://github.com/Joe-Simo/preflight", video: "" },
];

const STATUS: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  pass: { label: "Pass", color: "text-ok", icon: <path d="M5 10.5l3.2 3.2L15 7" /> },
  fail: { label: "Fail", color: "text-bad", icon: <path d="M6 6l8 8M14 6l-8 8" /> },
  check: { label: "Check yourself", color: "text-warn", icon: <path d="M10 5.5v5.5M10 14.2v.3" /> },
  error: { label: "Couldn't check", color: "text-mute", icon: <path d="M6 10h8" /> },
};

function Icon({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span className={`mt-[1px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/40 ${s.color}`} aria-hidden>
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
    </span>
  );
}

function Field(props: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void; placeholder: string; error?: string }) {
  return (
    <div>
      <label htmlFor={props.id} className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium">
        {props.label}
        <span className="text-xs font-normal text-mute">{props.hint}</span>
      </label>
      <input
        id={props.id}
        name={props.id}
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={!!props.error}
        aria-describedby={props.error ? `${props.id}-err` : undefined}
        className={`w-full rounded-lg border bg-bg px-3.5 py-2.5 font-mono text-[14px] text-ink placeholder:text-mute/60 ${props.error ? "border-bad" : "border-line"}`}
      />
      {props.error ? <p id={`${props.id}-err`} className="mt-1.5 text-sm text-bad">{props.error}</p> : null}
    </div>
  );
}

function localDeadline(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

function left(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "Closed";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h ${Math.floor((ms % 3600000) / 60000)}m left`;
}

export function Preflight() {
  const [hackathon, setHackathon] = useState("");
  const [repo, setRepo] = useState("");
  const [video, setVideo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FieldError | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function run(input?: { hackathon: string; repo: string; video: string }) {
    const body = input ?? { hackathon, repo, video };
    if (input) {
      setHackathon(input.hackathon);
      setRepo(input.repo);
      setVideo(input.video);
    }
    if (!body.hackathon.trim()) {
      setError({ field: "hackathon", message: "Paste a link to a Devpost hackathon first." });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/preflight", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? { field: "form", message: "Something went wrong. Try again." });
        setResult(null);
      } else {
        setResult(json as Result);
      }
    } catch {
      setError({ field: "form", message: "Couldn't reach Preflight. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  const groups = result ? (["Timing", "Repository", "Video"] as const).map((g) => ({ g, items: result.checks.filter((c) => c.group === g) })).filter((x) => x.items.length) : [];
  const s = result?.summary;

  return (
    <div>
      <form
        className="rounded-2xl border border-line bg-panel p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="grid gap-4">
          <Field id="hackathon" label="Hackathon" hint="any page on the event's devpost.com site" value={hackathon} onChange={setHackathon} placeholder="https://learn-ai-basics.devpost.com" error={error?.field === "hackathon" ? error.message : undefined} />
          <Field id="repo" label="Repository" hint="GitHub" value={repo} onChange={setRepo} placeholder="https://github.com/you/your-project" error={error?.field === "repo" ? error.message : undefined} />
          <Field id="video" label="Demo video" hint="YouTube or Vimeo, optional" value={video} onChange={setVideo} placeholder="https://youtu.be/..." error={error?.field === "video" ? error.message : undefined} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <button type="submit" disabled={loading} className="rounded-lg bg-ok px-5 py-2.5 text-[15px] font-semibold text-[#0b1a11] transition hover:brightness-110 disabled:opacity-60">
            {loading ? "Checking..." : "Run preflight"}
          </button>
          {loading ? <span className="text-sm text-mute" role="status">Reading the Official Rules, checking the repo and the video</span> : null}
        </div>
        {error?.field === "form" ? <p className="mt-3 text-sm text-bad">{error.message}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
          <span className="mr-1 text-mute">Try:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex.label} type="button" disabled={loading} onClick={() => run(ex)} className="rounded-full border border-line px-3 py-1 text-ink/90 transition hover:border-mute disabled:opacity-60">
              {ex.label}
            </button>
          ))}
        </div>
      </form>

      {result ? (
        <section className="mt-8" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <a href={result.event.url} className="text-xl font-semibold tracking-tight hover:underline" target="_blank" rel="noreferrer">{result.event.title}</a>
              {result.event.deadline ? (
                <p className="mt-1 text-sm text-mute">
                  Deadline {localDeadline(result.event.deadline)} <span className="text-ink">· {left(result.event.deadline)}</span>
                </p>
              ) : null}
            </div>
            {s ? (
              <p className="text-sm text-mute">
                <span className="text-ok">{s.pass} pass</span> · <span className={s.fail ? "text-bad" : ""}>{s.fail} fail</span> · <span className={s.check ? "text-warn" : ""}>{s.check} to confirm</span>
                {s.error ? <> · {s.error} couldn&apos;t check</> : null}
              </p>
            ) : null}
          </div>
          {s && s.fail === 0 && s.error === 0 ? <p className="mt-4 rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 text-[15px]">Nothing fails. Confirm the amber items yourself, then submit.</p> : null}
          {s && s.fail > 0 ? <p className="mt-4 rounded-xl border border-bad/30 bg-bad/5 px-4 py-3 text-[15px]">Fix {s.fail === 1 ? "the failing check" : `the ${s.fail} failing checks`} before you submit, then run it again.</p> : null}
          {!result.event.rulesFound ? <p className="mt-4 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-[15px]">This event&apos;s Official Rules page has little or no text yet, so only basic checks ran.</p> : null}

          {groups.map(({ g, items }) => (
            <div key={g} className="mt-7">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-mute">{g}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
                {items.map((c) => (
                  <li key={c.id} className="flex gap-3.5 px-4 py-4 sm:px-5" data-status={c.status}>
                    <Icon status={c.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <h3 className="text-[15px] font-medium">{c.title}</h3>
                        <span className={`text-xs font-medium ${STATUS[c.status].color}`}>{STATUS[c.status].label}</span>
                      </div>
                      <p className="mt-1 text-[14px] leading-relaxed text-mute">{c.found}</p>
                      {c.rule ? (
                        <blockquote className="mt-2.5 border-l-2 border-line pl-3 font-mono text-[12.5px] leading-relaxed text-ink/80">
                          &ldquo;{c.rule}&rdquo;{" "}
                          <a href={result.event.rulesUrl} target="_blank" rel="noreferrer" className="whitespace-nowrap font-sans text-mute underline decoration-line underline-offset-2 hover:text-ink">Official Rules</a>
                        </blockquote>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {result.criteria.rules.length || result.criteria.overview.length ? (
            <div className="mt-7">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-mute">What the judges score</h2>
              <div className="rounded-2xl border border-line bg-panel px-4 py-4 sm:px-5">
                {result.criteria.mismatch ? <p className="mb-4 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2.5 text-[14px] leading-relaxed text-warn">{result.criteria.mismatch}</p> : null}
                <ol className="grid gap-3">
                  {(result.criteria.rules.length ? result.criteria.rules : result.criteria.overview).map((c, i) => (
                    <li key={c.name} className="grid grid-cols-[1.5rem_1fr] gap-x-1 text-[14px] leading-relaxed">
                      <span className="text-mute">{i + 1}.</span>
                      <span><span className="font-medium text-ink">{c.name}.</span> <span className="text-mute">{c.question}</span></span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-mute">From the {result.criteria.rules.length ? "Official Rules" : "overview page"}. Name each one in your description.</p>
              </div>
            </div>
          ) : null}

          {result.eligibility.length ? (
            <div className="mt-7">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-mute">Who can enter (confirm yourself)</h2>
              <ul className="flex flex-wrap gap-2">
                {result.eligibility.map((e) => (
                  <li key={e} className="rounded-full border border-line bg-panel px-3 py-1 text-[13px] text-ink/90">{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
