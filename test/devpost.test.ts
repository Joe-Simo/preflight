import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractRules, parseHackathonUrl, parseRulesDate } from "@/lib/devpost";

const fx = (slug: string, kind: "overview" | "rules") => readFileSync(path.join(__dirname, "fixtures", `${slug}.${kind}.html`), "utf8");
const load = (slug: string) => extractRules(fx(slug, "overview"), fx(slug, "rules"), `https://${slug}.devpost.com`);

describe("parseHackathonUrl", () => {
  it("accepts any page of an event subdomain", () => {
    expect(parseHackathonUrl("https://learn-ai-basics.devpost.com/rules")?.base).toBe("https://learn-ai-basics.devpost.com");
    expect(parseHackathonUrl("qloo.devpost.com")?.slug).toBe("qloo");
  });
  it("rejects non-Devpost and non-event hosts", () => {
    expect(parseHackathonUrl("https://example.com")).toBeNull();
    expect(parseHackathonUrl("https://devpost.com/hackathons")).toBeNull();
    expect(parseHackathonUrl("https://evil.devpost.com.example.com")).toBeNull();
    expect(parseHackathonUrl("not a url")).toBeNull();
  });
});

describe("parseRulesDate", () => {
  it("reads Eastern and Pacific times with daylight saving", () => {
    expect(parseRulesDate("September 22, 2026 (10:00 am Eastern Time)")).toBe("2026-09-22T10:00:00-04:00");
    expect(parseRulesDate("Monday, August 31, 2026 (10:15 am Pacific Time)")).toBe("2026-08-31T10:15:00-07:00");
    expect(parseRulesDate("Thursday Nov 12, 2026 (12:00 pm Pacific Time)")).toBe("2026-11-12T12:00:00-08:00");
  });
});

describe("extractRules: Build With AI: Basics", () => {
  const r = load("learn-ai-basics");
  it("reads title, deadline and period", () => {
    expect(r.title).toBe("Build With AI: Basics");
    expect(r.deadline).toBe("2026-10-26T17:00:00-04:00");
    expect(r.periodStart).toBe("2026-09-22T10:00:00-04:00");
  });
  it("quotes the repository rules", () => {
    expect(r.repo.publicRule?.text).toMatch(/^The repository must be public/);
    expect(r.repo.licenseRule?.text).toMatch(/detectable and visible/);
    expect(r.repo.hosts).toEqual(["GitHub", "GitLab", "Bitbucket"]);
  });
  it("finds the planning files and new-project rule", () => {
    expect(r.requiredFiles.files).toEqual(["scope.md", "prd.md", "spec.md"]);
    expect(r.newProjects.mode).toBe("new");
  });
  it("reads the video rules", () => {
    expect(r.video.required).toBe(true);
    expect(r.video.maxMinutes).toBe(3);
    expect(r.video.hosts).toEqual(["YouTube", "Vimeo"]);
    expect(r.video.mustBePublic).toBe(true);
  });
  it("finds four criteria in the rules and three on the overview", () => {
    expect(r.criteria.rules.map((c) => c.name)).toEqual(["Design", "Potential Impact", "Innovation/Idea", "Presentation"]);
    expect(r.criteria.overview.map((c) => c.name)).toEqual(["Design", "Innovation/Idea", "Presentation"]);
    expect(r.eligibility[0]).toBe("Ages 18+ only");
  });
});

describe("extractRules: other events", () => {
  it("Amazon: YouTube or Vimeo, new or updated projects, four criteria without track notes", () => {
    const r = load("amazonappdev2026");
    expect(r.video.hosts).toEqual(["YouTube", "Vimeo"]);
    expect(r.video.maxMinutes).toBe(3);
    expect(r.newProjects.mode).toBe("new-or-updated");
    expect(r.criteria.rules.map((c) => c.name)).toEqual(["Tech Implementation", "Design", "Potential Impact", "Quality of the Idea"]);
    expect(r.periodStart).toBe("2026-08-31T10:15:00-07:00");
  });
  it("Qloo: no video requirement", () => {
    const r = load("qloo");
    expect(r.video.required).toBe(false);
    expect(r.repo.publicRule).not.toBeNull();
    expect(r.criteria.rules).toHaveLength(4);
    expect(r.periodStart).toBe("2026-09-30T09:00:00-04:00");
  });
  it("PayPal: YouTube only", () => {
    const r = load("paypalaihackathon");
    expect(r.video.hosts).toEqual(["YouTube"]);
    expect(r.repo.licenseRule?.text).toMatch(/detectable/);
    expect(r.criteria.rules).toHaveLength(5);
  });
});
