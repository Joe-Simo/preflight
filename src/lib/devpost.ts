import { sentences, stripTags, textBlocks } from "./text";

export type Criterion = { name: string; question: string };
export type Quote = { text: string };

export type EventRules = {
  title: string;
  url: string;
  rulesUrl: string;
  deadline: string | null; // ISO with offset
  periodStart: string | null; // ISO with offset
  periodStartText: string | null;
  rulesFound: boolean;
  repo: {
    required: boolean;
    publicRule: Quote | null;
    licenseRule: Quote | null;
    hosts: string[];
    instructionsRule: Quote | null;
  };
  newProjects: { mode: "new" | "new-or-updated" | "unknown"; rule: Quote | null };
  requiredFiles: { files: string[]; rule: Quote | null };
  video: {
    required: boolean;
    maxMinutes: number | null;
    lengthRule: Quote | null;
    hosts: string[];
    hostRule: Quote | null;
    mustBePublic: boolean;
  };
  criteria: { rules: Criterion[]; overview: Criterion[] };
  eligibility: string[];
};

const HOST_RE = /^([a-z0-9-]+)\.devpost\.com$/i;

/** Accepts any page of a Devpost hackathon and returns its slug, or null. */
export function parseHackathonUrl(input: string): { slug: string; base: string } | null {
  let u: URL;
  try {
    u = new URL(input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const m = u.hostname.match(HOST_RE);
  if (!m || ["www", "devpost", "help", "info", "secure"].includes(m[1].toLowerCase())) return null;
  const slug = m[1].toLowerCase();
  return { slug, base: `https://${slug}.devpost.com` };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const ZONES: Record<string, string> = {
  eastern: "America/New_York", pacific: "America/Los_Angeles", central: "America/Chicago", mountain: "America/Denver",
  et: "America/New_York", pt: "America/Los_Angeles", ct: "America/Chicago", mt: "America/Denver", utc: "UTC", gmt: "UTC",
};

function offsetMinutes(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcMs) / 60000);
}

/** Wall-clock time in a named zone to an ISO string with that zone's offset. */
export function zonedIso(y: number, mo: number, d: number, h: number, mi: number, timeZone: string): string {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let off = offsetMinutes(timeZone, guess);
  off = offsetMinutes(timeZone, guess - off * 60000);
  const utc = new Date(guess - off * 60000);
  const sign = off < 0 ? "-" : "+";
  const abs = Math.abs(off);
  const local = new Date(utc.getTime() + off * 60000).toISOString().slice(0, 19);
  return `${local}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** Parses "Monday, August 31, 2026 (10:15 am Pacific Time)" style dates. */
export function parseRulesDate(text: string): string | null {
  const m = text.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\s*\(?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*([A-Za-z]+)?/i);
  if (!m) return null;
  const mo = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!mo) return null;
  let h = Number(m[4]);
  const ampm = m[6]?.toLowerCase().replace(/\./g, "");
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  const zone = ZONES[(m[7] ?? "eastern").toLowerCase()] ?? "America/New_York";
  return zonedIso(Number(m[3]), mo, Number(m[2]), h, Number(m[5] ?? 0), zone);
}

function findSentence(blocks: string[], test: (s: string) => boolean): Quote | null {
  for (const b of blocks) for (const s of sentences(b)) if (test(s)) return { text: s.replace(/[;:,]\s*(and|or)?\s*$/i, "").trim() };
  return null;
}

const HOST_NAMES = ["GitHub", "GitLab", "Bitbucket"];
const VIDEO_HOSTS = ["YouTube", "Vimeo", "Youku"];
const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

export function extractRules(overviewHtml: string, rulesHtml: string, base: string): EventRules {
  const rules = textBlocks(rulesHtml);
  const title =
    stripTags(overviewHtml.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i)?.[1] ?? "") ||
    stripTags(overviewHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").split(":")[0] ||
    base;
  const deadline = overviewHtml.match(/data-iso-date="([^"]+)"/)?.[1] ?? null;

  const periodBlock = rules.find((b) => /^(Registration (and|&) )?Submission Period\s*:/i.test(b)) ?? rules.find((b) => /Submission Period\s*:/i.test(b));
  const periodStartText = periodBlock ? periodBlock.replace(/^.*?Submission Period[^:]*:\s*/i, "").split(/\s[\u2013\u2014-]\s/)[0].trim() : null;
  const periodStart = periodStartText ? parseRulesDate(periodStartText) : null;

  const repoBlocks = rules.filter((b) => /\brepositor(y|ies)\b/i.test(b));
  const publicRule = findSentence(repoBlocks, (s) => /repositor/i.test(s) && /\bpublic\b/i.test(s) && /must|should/i.test(s));
  const licenseRule =
    findSentence(repoBlocks, (s) => /licen[cs]e/i.test(s) && /detectable/i.test(s)) ??
    findSentence(repoBlocks, (s) => /licen[cs]e/i.test(s) && /open source licen|license file/i.test(s));
  const instructionsRule = findSentence(repoBlocks, (s) => /instructions/i.test(s) && /repositor/i.test(s));
  const hostSentence = findSentence(repoBlocks, (s) => /URL to your (public )?code repository/i.test(s));
  const hosts = hostSentence ? HOST_NAMES.filter((h) => new RegExp(h, "i").test(hostSentence.text)) : [];

  const newRule = findSentence(rules, (s) => /newly created/i.test(s));
  const updatedAllowed = newRule ? /significantly updated|existed prior/i.test(newRule.text) : false;

  const fileRe = /\b([A-Za-z0-9_-]+\.(?:md|txt))\b/g;
  const fileRule = findSentence(rules, (s) => /\b[A-Za-z0-9_-]+\.md\b/.test(s) && /repositor|must include/i.test(s));
  const files = fileRule ? [...new Set([...fileRule.text.matchAll(fileRe)].map((m) => m[1]))] : [];

  const videoBlocks = rules.filter((b) => /\bvideo\b/i.test(b));
  const videoRequired = rules.some((b) => /Include a (demonstration|demo) video/i.test(b)) || videoBlocks.some((b) => /video must be uploaded|uploaded to and made publicly visible/i.test(b));
  const lengthRule = findSentence(rules, (s) => /(less than|under|no (longer|more) than|not exceed|maximum of|max)\s+[^.]*?minutes?/i.test(s) && (/video/i.test(s) || /should be/i.test(s)));
  let maxMinutes: number | null = null;
  if (lengthRule) {
    const n = lengthRule.text.match(/\((\d+)\)\s*minutes?/i) ?? lengthRule.text.match(/(\d+)\s*minutes?/i);
    const w = lengthRule.text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b[^.]*?minutes?/i);
    maxMinutes = n ? Number(n[1]) : w ? WORD_NUMBERS[w[1].toLowerCase()] : null;
  }
  const hostRule = findSentence(rules, (s) => /uploaded to|hosted on|publicly visible on|available on/i.test(s) && VIDEO_HOSTS.some((h) => s.includes(h)));
  const videoHosts = hostRule ? VIDEO_HOSTS.filter((h) => hostRule.text.includes(h)) : [];

  // Criteria from the Official Rules: "Name: question?" items between the criteria intro and the scoring paragraph.
  const start = rules.findIndex((b) => /judged on the following|following equally weighted criteria/i.test(b));
  const end = rules.findIndex((b, i) => i > start && /^The scores from the Judges/i.test(b));
  const ruleCriteria: Criterion[] = [];
  if (start >= 0) {
    for (const b of rules.slice(start + 1, end > start ? end : start + 25)) {
      const m = b.match(/^(?:\d+\.\s*)?([A-Z][A-Za-z/&+' -]{2,40}?)\s*:\s+(.+\?.*)$/);
      if (m && !/bonus/i.test(m[1])) ruleCriteria.push({ name: m[1].trim(), question: m[2].trim() });
    }
  }
  const overviewCriteria: Criterion[] = [];
  const crit = overviewHtml.match(/<article id="judging-criteria">([\s\S]*?)<\/article>/i)?.[1] ?? "";
  for (const li of crit.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
    const name = stripTags(li[1].match(/<strong>([\s\S]*?)<\/strong>/i)?.[1] ?? "");
    const question = stripTags(li[1].replace(/<strong>[\s\S]*?<\/strong>/i, ""));
    if (name) overviewCriteria.push({ name, question });
  }

  const eligHtml = overviewHtml.match(/<ul id="eligibility-list"[^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? "";
  const eligibility = [...eligHtml.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((m) => stripTags(m[1])).filter(Boolean);

  return {
    title,
    url: `${base}/`,
    rulesUrl: `${base}/rules`,
    deadline,
    periodStart,
    periodStartText,
    rulesFound: rules.length > 20,
    repo: { required: repoBlocks.some((b) => /URL to your (public )?code repository/i.test(b)), publicRule, licenseRule, hosts, instructionsRule },
    newProjects: { mode: newRule ? (updatedAllowed ? "new-or-updated" : "new") : "unknown", rule: newRule },
    requiredFiles: { files, rule: files.length ? fileRule : null },
    video: { required: videoRequired, maxMinutes, lengthRule, hosts: videoHosts, hostRule, mustBePublic: !!hostRule && /public/i.test(hostRule.text) },
    criteria: { rules: ruleCriteria, overview: overviewCriteria },
    eligibility,
  };
}

const UA = "Preflight/0.1 (+https://github.com/Joe-Simo/preflight)";

export async function fetchText(url: string, timeoutMs = 10000): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  return { status: res.status, text: await res.text() };
}

export async function fetchEvent(base: string): Promise<EventRules> {
  const [overview, rules] = await Promise.all([fetchText(`${base}/`), fetchText(`${base}/rules`)]);
  if (overview.status === 404) throw new Error("Devpost has no hackathon at that address.");
  if (overview.status >= 400) throw new Error(`Devpost answered ${overview.status} for the hackathon page.`);
  return extractRules(overview.text, rules.status < 400 ? rules.text : "", base);
}
