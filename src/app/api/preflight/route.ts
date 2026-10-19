import { buildChecks, criteriaMismatch, summarize } from "@/lib/checks";
import { fetchEvent, parseHackathonUrl, type EventRules } from "@/lib/devpost";
import { checkRepo } from "@/lib/github";
import { checkVideo } from "@/lib/video";

export const runtime = "nodejs";
export const maxDuration = 30;

const cache = new Map<string, { at: number; rules: EventRules }>();
const TTL = 10 * 60 * 1000;

async function eventRules(base: string): Promise<EventRules> {
  const hit = cache.get(base);
  if (hit && Date.now() - hit.at < TTL) return hit.rules;
  const rules = await fetchEvent(base);
  cache.set(base, { at: Date.now(), rules });
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return rules;
}

function bad(field: string, message: string, status = 400) {
  return Response.json({ error: { field, message } }, { status });
}

export async function POST(req: Request) {
  let body: { hackathon?: unknown; repo?: unknown; video?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("form", "Send JSON with hackathon, repo and video.");
  }
  const hackathon = typeof body.hackathon === "string" ? body.hackathon.slice(0, 300) : "";
  const repoUrl = typeof body.repo === "string" ? body.repo.trim().slice(0, 300) : "";
  const videoUrl = typeof body.video === "string" ? body.video.trim().slice(0, 300) : "";

  const event = parseHackathonUrl(hackathon);
  if (!event) return bad("hackathon", "Use a link to a Devpost hackathon, like https://learn-ai-basics.devpost.com");

  const [rulesR, repoR, videoR] = await Promise.allSettled([
    eventRules(event.base),
    repoUrl ? checkRepo(repoUrl) : Promise.resolve(null),
    videoUrl ? checkVideo(videoUrl) : Promise.resolve(null),
  ]);
  if (rulesR.status === "rejected") {
    const msg = rulesR.reason instanceof Error && /Devpost/.test(rulesR.reason.message) ? rulesR.reason.message : "Couldn't reach Devpost. Try again in a moment.";
    return bad("hackathon", msg, 502);
  }
  const rules = rulesR.value;
  const repo = repoR.status === "fulfilled" ? repoR.value : { ok: false as const, reason: "error" as const, message: "GitHub didn't answer in time." };
  const video = videoR.status === "fulfilled" ? videoR.value : { ok: false as const, reason: "error" as const, message: "The video host didn't answer in time." };
  if (repo && !repo.ok && repo.reason === "invalid") return bad("repo", repo.message);
  if (video && !video.ok && video.reason === "invalid") return bad("video", "That isn't a video link.");

  const checks = buildChecks(rules, repo, video, Date.now());
  return Response.json({
    event: { title: rules.title, url: rules.url, rulesUrl: rules.rulesUrl, deadline: rules.deadline, periodStart: rules.periodStart, rulesFound: rules.rulesFound },
    summary: summarize(checks),
    checks,
    criteria: { rules: rules.criteria.rules, overview: rules.criteria.overview, mismatch: criteriaMismatch(rules) },
    eligibility: rules.eligibility,
  });
}
