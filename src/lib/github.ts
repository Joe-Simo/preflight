export type RepoFinding =
  | { ok: false; reason: "invalid" | "not-found" | "rate-limited" | "error"; message: string; owner?: string; name?: string }
  | {
      ok: true;
      owner: string;
      name: string;
      url: string;
      isPrivate: boolean;
      license: { spdx: string; name: string } | null;
      createdAt: string;
      pushedAt: string;
      defaultBranch: string;
      paths: string[] | null; // null when the tree could not be read
      truncated: boolean;
    };

export function parseRepoUrl(input: string): { owner: string; name: string } | null {
  const t = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const m = t.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:\/.*)?$/i);
  if (!m || m[2] === "." || m[2] === "..") return null;
  return { owner: m[1], name: m[2] };
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const headers = { accept: "application/vnd.github+json", "user-agent": "Preflight/0.1 (+https://github.com/Joe-Simo/preflight)", "x-github-api-version": "2022-11-28" };

function limited(res: Response): boolean {
  return (res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0";
}

export async function checkRepo(input: string, f: Fetcher = fetch): Promise<RepoFinding> {
  const p = parseRepoUrl(input);
  if (!p) return { ok: false, reason: "invalid", message: "That isn't a GitHub repository link (https://github.com/owner/repo)." };
  const api = `https://api.github.com/repos/${p.owner}/${p.name}`;
  const res = await f(api, { headers, signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return { ok: false, reason: "not-found", message: "GitHub shows no public repository at that address. It is private, renamed, or doesn't exist.", ...p };
  if (limited(res)) return { ok: false, reason: "rate-limited", message: "GitHub's limit for anonymous checks was reached. Try again in a few minutes.", ...p };
  if (!res.ok) return { ok: false, reason: "error", message: `GitHub answered ${res.status}.`, ...p };
  const r = (await res.json()) as {
    name: string; full_name: string; html_url: string; private: boolean; created_at: string; pushed_at: string; default_branch: string;
    license: { spdx_id: string | null; name: string } | null; owner: { login: string };
  };
  let paths: string[] | null = null;
  let truncated = false;
  const tree = await f(`${api}/git/trees/${encodeURIComponent(r.default_branch)}?recursive=1`, { headers, signal: AbortSignal.timeout(10000) });
  if (tree.ok) {
    const t = (await tree.json()) as { tree: { path: string; type: string }[]; truncated: boolean };
    paths = t.tree.filter((x) => x.type === "blob").map((x) => x.path);
    truncated = t.truncated;
  } else if (tree.status === 409) {
    paths = []; // empty repository
  }
  const spdx = r.license?.spdx_id;
  return {
    ok: true,
    owner: r.owner.login,
    name: r.name,
    url: r.html_url,
    isPrivate: r.private,
    license: spdx && spdx !== "NOASSERTION" ? { spdx, name: r.license!.name } : null,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    defaultBranch: r.default_branch,
    paths,
    truncated,
  };
}
