import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildChecks, criteriaMismatch, summarize, timeLeft } from "@/lib/checks";
import { extractRules } from "@/lib/devpost";
import { checkRepo, parseRepoUrl, type RepoFinding } from "@/lib/github";
import { checkVideo, detectHost } from "@/lib/video";

const fx = (slug: string, kind: string) => readFileSync(path.join(import.meta.dirname, "fixtures", `${slug}.${kind}.html`), "utf8");
const learn = extractRules(fx("learn-ai-basics", "overview"), fx("learn-ai-basics", "rules"), "https://learn-ai-basics.devpost.com");
const amazon = extractRules(fx("amazonappdev2026", "overview"), fx("amazonappdev2026", "rules"), "https://amazonappdev2026.devpost.com");
const NOW = Date.parse("2026-10-19T18:00:00Z");

const repo = (over: Partial<Extract<RepoFinding, { ok: true }>> = {}): RepoFinding => ({
  ok: true, owner: "Joe-Simo", name: "demo", url: "https://github.com/Joe-Simo/demo", isPrivate: false,
  license: { spdx: "MIT", name: "MIT License" }, createdAt: "2026-10-19T15:00:00Z", pushedAt: "2026-10-19T16:00:00Z",
  defaultBranch: "main", paths: ["README.md", "LICENSE", "devpost/scope.md", "devpost/prd.md", "devpost/spec.md"], truncated: false, ...over,
});
const yt = { ok: true as const, host: "YouTube" as const, url: "https://youtu.be/x", title: "Demo", author: "Joe Simo", durationSeconds: null };
const byId = (c: ReturnType<typeof buildChecks>) => Object.fromEntries(c.map((x) => [x.id, x]));

describe("buildChecks", () => {
  it("passes a complete entry and quotes the rules", () => {
    const c = byId(buildChecks(learn, repo(), yt, NOW));
    expect(c["repo-public"].status).toBe("pass");
    expect(c["repo-public"].rule).toMatch(/^The repository must be public/);
    expect(c["repo-license"].status).toBe("pass");
    expect(c["repo-new"].status).toBe("pass");
    expect(c["repo-files"].status).toBe("pass");
    expect(c["repo-files"].title).toBe("scope.md, prd.md, and spec.md are in the repository");
    expect(c["repo-files"].found).toBe("Found devpost/scope.md, devpost/prd.md, devpost/spec.md.");
    expect(c["video-host"].status).toBe("pass");
    expect(c["video-length"].status).toBe("check");
    expect(c.deadline.found).toBe("7 days 3 hours left");
  });
  it("fails a private or missing repo against the public rule", () => {
    const c = byId(buildChecks(learn, { ok: false, reason: "not-found", message: "GitHub shows no public repository at that address." }, null, NOW));
    expect(c["repo-public"].status).toBe("fail");
    expect(c["repo-public"].rule).toMatch(/must be public/);
    expect(c["video-missing"].status).toBe("check");
  });
  it("fails missing planning files, no license, and an old repo", () => {
    const c = byId(buildChecks(learn, repo({ license: null, createdAt: "2026-01-02T00:00:00Z", paths: ["README.md"] }), yt, NOW));
    expect(c["repo-files"].status).toBe("fail");
    expect(c["repo-files"].found).toBe("Missing scope.md, prd.md, and spec.md on main.");
    expect(c["repo-license"].status).toBe("fail");
    expect(c["repo-new"].status).toBe("fail");
  });
  it("allows older repos updated in the window when the rules allow existing projects", () => {
    const c = byId(buildChecks(amazon, repo({ createdAt: "2026-01-02T00:00:00Z" }), yt, NOW));
    expect(c["repo-new"].status).toBe("check");
    expect(amazon.requiredFiles.files).toEqual([]);
    expect(c["repo-files"]).toBeUndefined();
  });
  it("rejects a host the event doesn't take, and checks Vimeo length", () => {
    const c = byId(buildChecks(learn, repo(), { ok: false, reason: "unsupported-host", host: "loom.com", message: "x" }, NOW));
    expect(c["video-host"].status).toBe("fail");
    expect(c["video-host"].found).toBe("This event takes YouTube or Vimeo.");
    const long = byId(buildChecks(learn, repo(), { ...yt, host: "Vimeo", durationSeconds: 200 }, NOW));
    expect(long["video-length"].status).toBe("fail");
    expect(long["video-length"].found).toBe("Vimeo reports 3:20.");
  });
  it("marks a closed event", () => {
    expect(byId(buildChecks(learn, null, null, Date.parse("2026-10-27T00:00:00Z"))).deadline.status).toBe("fail");
    expect(timeLeft("2026-10-19T19:30:00Z", NOW)).toBe("1 hour 30 min left");
  });
  it("counts statuses", () => {
    expect(summarize(buildChecks(learn, repo(), yt, NOW))).toEqual({ pass: 8, fail: 0, check: 1, error: 0 });
  });
});

describe("criteriaMismatch", () => {
  it("notices the overview page leaving out a scored criterion", () => {
    expect(criteriaMismatch(learn)).toMatch(/leaves out Potential Impact/);
    expect(criteriaMismatch(amazon)).toBeNull();
  });
});

describe("GitHub and video helpers", () => {
  it("parses repo links", () => {
    expect(parseRepoUrl("https://github.com/Joe-Simo/larder/tree/main")).toEqual({ owner: "Joe-Simo", name: "larder" });
    expect(parseRepoUrl("github.com/a/b.git")).toEqual({ owner: "a", name: "b" });
    expect(parseRepoUrl("https://gitlab.com/a/b")).toBeNull();
  });
  it("maps GitHub answers", async () => {
    const fake = async (url: string) => {
      if (url.endsWith("/repos/a/b")) return Response.json({ name: "b", full_name: "a/b", html_url: "https://github.com/a/b", private: false, created_at: "2026-10-19T00:00:00Z", pushed_at: "2026-10-19T00:00:00Z", default_branch: "main", license: { spdx_id: "NOASSERTION", name: "Other" }, owner: { login: "a" } });
      if (url.includes("/git/trees/main")) return Response.json({ tree: [{ path: "README.md", type: "blob" }, { path: "src", type: "tree" }], truncated: false });
      return new Response("", { status: 404 });
    };
    const r = await checkRepo("https://github.com/a/b", fake);
    expect(r.ok && r.license).toBeNull();
    expect(r.ok && r.paths).toEqual(["README.md"]);
    expect((await checkRepo("https://github.com/a/missing", fake)).ok).toBe(false);
    const limited = async () => new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0" } });
    const l = await checkRepo("https://github.com/a/b", limited);
    expect(!l.ok && l.reason).toBe("rate-limited");
  });
  it("detects hosts and maps oEmbed answers", async () => {
    expect(detectHost("https://youtu.be/abc")?.host).toBe("YouTube");
    expect(detectHost("https://www.youtube.com/watch?v=abc")?.host).toBe("YouTube");
    expect(detectHost("https://vimeo.com/123")?.host).toBe("Vimeo");
    const priv = await checkVideo("https://youtu.be/abc", async () => new Response("Unauthorized", { status: 401 }));
    expect(!priv.ok && priv.reason).toBe("unavailable");
    const vim = await checkVideo("https://vimeo.com/1", async () => Response.json({ title: "T", author_name: "A", duration: 97 }));
    expect(vim.ok && vim.durationSeconds).toBe(97);
  });
});
