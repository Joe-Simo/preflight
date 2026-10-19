import type { EventRules } from "./devpost";
import type { RepoFinding } from "./github";
import type { VideoFinding } from "./video";

export type Status = "pass" | "fail" | "check" | "error";
export type Group = "Timing" | "Repository" | "Video";
export type Check = { id: string; group: Group; status: Status; title: string; found: string; rule?: string };

const DAY = 86400000;

export function timeLeft(deadlineIso: string, now: number): string {
  const ms = Date.parse(deadlineIso) - now;
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d} day${d === 1 ? "" : "s"} ${h} hour${h === 1 ? "" : "s"} left`;
  if (h > 0) return `${h} hour${h === 1 ? "" : "s"} ${m} min left`;
  return `${m} min left`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function fmtDuration(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

export function criteriaMismatch(rules: EventRules): string | null {
  const a = rules.criteria.rules.map((c) => c.name);
  const b = rules.criteria.overview.map((c) => c.name);
  if (!a.length || !b.length) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const missing = a.filter((n) => !b.some((m) => norm(m) === norm(n)));
  const extra = b.filter((n) => !a.some((m) => norm(m) === norm(n)));
  if (!missing.length && !extra.length) return null;
  const parts: string[] = [];
  if (missing.length) parts.push(`The overview page leaves out ${missing.join(", ")}, which the Official Rules score.`);
  if (extra.length) parts.push(`The overview page lists ${extra.join(", ")}, which the Official Rules don't.`);
  return `${parts.join(" ")} Devpost rules say the Official Rules prevail when pages disagree.`;
}

export function buildChecks(rules: EventRules, repo: RepoFinding | null, video: VideoFinding | null, now: number): Check[] {
  const out: Check[] = [];

  // Timing
  if (rules.deadline) {
    const closed = Date.parse(rules.deadline) <= now;
    out.push({
      id: "deadline",
      group: "Timing",
      status: closed ? "fail" : "pass",
      title: closed ? "Submissions are closed" : "Submissions are open",
      found: closed ? "The deadline has passed." : timeLeft(rules.deadline, now),
    });
  }

  // Repository
  if (!repo) {
    if (rules.repo.required) out.push({ id: "repo-missing", group: "Repository", status: "check", title: "Add your repository link", found: "This event asks for a code repository. Paste one to check it.", rule: rules.repo.publicRule?.text });
  } else if (!repo.ok) {
    if (repo.reason === "not-found") {
      out.push({ id: "repo-public", group: "Repository", status: "fail", title: "Repository is public", found: repo.message, rule: rules.repo.publicRule?.text });
    } else {
      out.push({ id: "repo-public", group: "Repository", status: "error", title: "Couldn't check the repository", found: repo.message });
    }
  } else {
    const hostOk = !rules.repo.hosts.length || rules.repo.hosts.includes("GitHub");
    if (!hostOk) out.push({ id: "repo-host", group: "Repository", status: "fail", title: "Repository host is allowed", found: `This event accepts ${rules.repo.hosts.join(", ")}.` });
    out.push({
      id: "repo-public",
      group: "Repository",
      status: repo.isPrivate ? "fail" : "pass",
      title: "Repository is public",
      found: repo.isPrivate ? "The repository is private." : `${repo.owner}/${repo.name} is public.`,
      rule: rules.repo.publicRule?.text,
    });
    if (rules.repo.licenseRule) {
      out.push({
        id: "repo-license",
        group: "Repository",
        status: repo.license ? "pass" : "fail",
        title: "Open source license is detected",
        found: repo.license
          ? `GitHub detects ${repo.license.name} (${repo.license.spdx}), so it shows in the About section.`
          : "GitHub doesn't detect a license. Add a standard LICENSE file at the root, for example MIT.",
        rule: rules.repo.licenseRule.text,
      });
    }
    if (rules.periodStart && rules.newProjects.mode !== "unknown") {
      const start = Date.parse(rules.periodStart);
      if (rules.newProjects.mode === "new") {
        const ok = Date.parse(repo.createdAt) >= start;
        out.push({
          id: "repo-new",
          group: "Repository",
          status: ok ? "pass" : "fail",
          title: "Project is new for this event",
          found: ok
            ? `The repository was created ${fmtDate(repo.createdAt)}, after the period opened (${fmtDate(rules.periodStart)}).`
            : `The repository was created ${fmtDate(repo.createdAt)}, before the period opened (${fmtDate(rules.periodStart)}). Old ideas are fine; old code is not.`,
          rule: rules.newProjects.rule?.text,
        });
      } else {
        const created = Date.parse(repo.createdAt) >= start;
        const pushed = Date.parse(repo.pushedAt) >= start;
        out.push({
          id: "repo-new",
          group: "Repository",
          status: created || pushed ? (created ? "pass" : "check") : "fail",
          title: created ? "Project is new for this event" : "Project was updated during the event",
          found: created
            ? `The repository was created ${fmtDate(repo.createdAt)}, after the period opened (${fmtDate(rules.periodStart)}).`
            : pushed
              ? `It existed before ${fmtDate(rules.periodStart)} and was last pushed ${fmtDate(repo.pushedAt)}. Explain what you changed during the event.`
              : `No pushes since the period opened (${fmtDate(rules.periodStart)}).`,
          rule: rules.newProjects.rule?.text,
        });
      }
    }
    if (repo.paths) {
      const files = rules.requiredFiles.files;
      if (files.length) {
        const found = files.map((f) => ({ f, hit: repo.paths!.find((p) => p.toLowerCase().split("/").pop() === f.toLowerCase()) }));
        const missing = found.filter((x) => !x.hit).map((x) => x.f);
        const list = (xs: string[]) => (xs.length < 3 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`);
        out.push({
          id: "repo-files",
          group: "Repository",
          status: !missing.length ? "pass" : repo.truncated ? "check" : "fail",
          title: `${list(files)} ${files.length === 1 ? "is" : "are"} in the repository`,
          found: !missing.length
            ? `Found ${found.map((x) => x.hit).join(", ")}.`
            : repo.truncated
              ? "The repository is too large to list fully. Check by hand."
              : `Missing ${list(missing)} on ${repo.defaultBranch}.${missing.length < files.length ? ` Found ${found.filter((x) => x.hit).map((x) => x.hit).join(", ")}.` : ""}`,
          rule: rules.requiredFiles.rule?.text,
        });
      }
      const readme = repo.paths.find((p) => /^readme(\.[a-z]+)?$/i.test(p));
      out.push({
        id: "repo-readme",
        group: "Repository",
        status: readme ? "pass" : "fail",
        title: "README with instructions",
        found: readme ? `${readme} is at the root. Make sure it says how to run the project.` : "No README at the root.",
        rule: rules.repo.instructionsRule?.text,
      });
    } else {
      out.push({ id: "repo-files", group: "Repository", status: "error", title: "Couldn't list the files", found: "GitHub didn't return the file list. Try again." });
    }
  }

  // Video
  if (!rules.video.required && !video) return out;
  if (!video) {
    out.push({ id: "video-missing", group: "Video", status: "check", title: "Add your video link", found: "This event requires a demo video. Paste the link to check it.", rule: rules.video.hostRule?.text });
    return out;
  }
  if (!video.ok && (video.reason === "invalid" || video.reason === "unsupported-host")) {
    const allowed = rules.video.hosts.length ? rules.video.hosts.join(" or ") : "YouTube, Vimeo, or Youku";
    out.push({ id: "video-host", group: "Video", status: video.host === "Youku" ? "check" : "fail", title: "Video host is allowed", found: video.host === "Youku" ? video.message : `This event takes ${allowed}.`, rule: rules.video.hostRule?.text });
    return out;
  }
  const host = video.host as string;
  const hostAllowed = !rules.video.hosts.length || rules.video.hosts.includes(host);
  out.push({
    id: "video-host",
    group: "Video",
    status: hostAllowed ? "pass" : "fail",
    title: "Video host is allowed",
    found: hostAllowed ? `${host} is accepted.` : `This event takes ${rules.video.hosts.join(" or ")}, not ${host}.`,
    rule: rules.video.hostRule?.text,
  });
  if (!video.ok) {
    out.push({ id: "video-public", group: "Video", status: video.reason === "unavailable" ? "fail" : "error", title: "Video is publicly viewable", found: video.message, rule: rules.video.hostRule?.text });
    return out;
  }
  out.push({
    id: "video-public",
    group: "Video",
    status: "pass",
    title: "Video is publicly viewable",
    found: `${host} shows "${video.title}"${video.author ? ` by ${video.author}` : ""} to anyone. Unlisted videos also pass this check; set it to Public if the rules say public.`,
    rule: rules.video.hostRule?.text,
  });
  if (rules.video.maxMinutes) {
    const limit = rules.video.maxMinutes * 60;
    if (video.durationSeconds != null) {
      const ok = video.durationSeconds < limit;
      out.push({ id: "video-length", group: "Video", status: ok ? "pass" : "fail", title: `Video is under ${rules.video.maxMinutes} minutes`, found: `${host} reports ${fmtDuration(video.durationSeconds)}.`, rule: rules.video.lengthRule?.text });
    } else {
      out.push({ id: "video-length", group: "Video", status: "check", title: `Video is under ${rules.video.maxMinutes} minutes`, found: `${host} doesn't report length without an API key. Check it in your upload.`, rule: rules.video.lengthRule?.text });
    }
  }
  return out;
}

export function summarize(checks: Check[]): { pass: number; fail: number; check: number; error: number } {
  return checks.reduce((a, c) => ({ ...a, [c.status]: a[c.status] + 1 }), { pass: 0, fail: 0, check: 0, error: 0 });
}
