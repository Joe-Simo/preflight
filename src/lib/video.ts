export type VideoHost = "YouTube" | "Vimeo" | "Youku";

export type VideoFinding =
  | { ok: false; reason: "invalid" | "unsupported-host" | "unavailable" | "error"; host?: VideoHost | string; message: string }
  | { ok: true; host: VideoHost; url: string; title: string; author: string | null; durationSeconds: number | null };

export function detectHost(input: string): { host: VideoHost | string; url: URL } | null {
  let u: URL;
  try {
    u = new URL(input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const h = u.hostname.replace(/^(www\.|m\.)/, "").toLowerCase();
  if (h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com")) return { host: "YouTube", url: u };
  if (h === "vimeo.com" || h === "player.vimeo.com") return { host: "Vimeo", url: u };
  if (h.endsWith("youku.com")) return { host: "Youku", url: u };
  return { host: h, url: u };
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export async function checkVideo(input: string, f: Fetcher = fetch): Promise<VideoFinding> {
  const d = detectHost(input);
  if (!d) return { ok: false, reason: "invalid", message: "That isn't a link." };
  const target = d.url.toString();
  let endpoint: string;
  if (d.host === "YouTube") endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target)}`;
  else if (d.host === "Vimeo") endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(target)}`;
  else return { ok: false, reason: "unsupported-host", host: d.host, message: d.host === "Youku" ? "Youku links can't be checked from here." : `Videos on ${d.host} can't be checked.` };
  const res = await f(endpoint, { headers: { "user-agent": "Preflight/0.1" }, signal: AbortSignal.timeout(10000) });
  if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 400) {
    return { ok: false, reason: "unavailable", host: d.host, message: `${d.host} won't show this video to the public (it is private, removed, or the link is wrong).` };
  }
  if (!res.ok) return { ok: false, reason: "error", host: d.host, message: `${d.host} answered ${res.status}.` };
  const j = (await res.json()) as { title?: string; author_name?: string; duration?: number };
  return { ok: true, host: d.host, url: target, title: j.title ?? "", author: j.author_name ?? null, durationSeconds: typeof j.duration === "number" ? j.duration : null };
}
