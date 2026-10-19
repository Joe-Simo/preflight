const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "\u2019", lsquo: "\u2018",
  rdquo: "\u201d", ldquo: "\u201c", ndash: "\u2013", mdash: "\u2014", hellip: "\u2026",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Visible text of each paragraph, list item and heading, in document order. */
export function textBlocks(html: string): string[] {
  const clean = html.replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const out: string[] = [];
  const re = /<(p|li|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    const t = stripTags(m[2]);
    if (t) out.push(t);
  }
  return out;
}

/** Split a block into sentences at ". " followed by a capital letter or quote. */
export function sentences(block: string): string[] {
  return block.split(/(?<=[.!?][)"\u201d]?)\s+(?=[A-Z"\u201c(])/).map((s) => s.trim()).filter(Boolean);
}
