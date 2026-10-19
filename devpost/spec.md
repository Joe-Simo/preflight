---
doc: spec
status: approved
---

# Preflight: Technical Spec

## How This Works, In Plain Language
A single Next.js page with one server endpoint. The page sends three links to the endpoint. The endpoint downloads the hackathon's overview page and Official Rules page, pulls out the rule sentences that matter, asks GitHub's public API about the repo, asks YouTube or Vimeo's public oEmbed endpoint about the video, and returns a list of checks. The page draws the list. Nothing is stored. This is the smallest shape that can quote real rules and test real links.

## The Core Journey Through the System
Entrant presses Run → page POSTs `{hackathon, repo, video}` to `/api/preflight` → `parseHackathonUrl` validates the Devpost host → `fetchEvent` downloads `/` and `/rules` → `extractRules` returns title, deadline, period start, quoted rule sentences, criteria, eligibility → `checkRepo` calls `api.github.com/repos/{o}/{r}` and `/git/trees/{branch}?recursive=1` → `checkVideo` calls oEmbed → `buildChecks` combines rules and findings into rows → JSON back → page renders. PRD ref: `prd.md > The Core Journey`.

## Stack
- Next.js 16.4 App Router, React 19.3, TypeScript 5.9 (https://nextjs.org/docs). Joe's daily stack.
- Tailwind CSS 4 (https://tailwindcss.com/docs).
- Vitest 5 for tests (https://vitest.dev).
- No HTML parser dependency: Devpost pages are regular; a small tag-stripper is enough and keeps the bundle small. Flagged risk: template changes break parsing; tests use saved real pages.

## Where It Runs and How Someone Tries It
- Vercel (project `preflight`, team simo-js), Node runtime. No API keys.
- Local: `pnpm install && pnpm dev`, open http://localhost:3000.
- Demo recording: the live site with the example buttons.

## Look and Feel
Background #0c0f0e, panels #141917, text #eef2ef, muted #94a39a, pass #7fd49b, fail #f08a7e, check yourself #f2c46b. Geist Sans and Geist Mono. Spacious, one column, max width 880 px. Copy is short and literal.

## Components

### `src/lib/devpost.ts`
URL validation, page fetch, and `extractRules(overviewHtml, rulesHtml)`. PRD ref: `prd.md > Reading the rules`.

### `src/lib/github.ts`
`checkRepo(url)` returning visibility, license SPDX id, created and pushed dates, default branch, file paths. PRD ref: `prd.md > Repository checks`.

### `src/lib/video.ts`
`checkVideo(url)` returning host, reachable, title, duration if reported. PRD ref: `prd.md > Video checks`.

### `src/lib/checks.ts`
`buildChecks(rules, repo, video, now)` producing rows `{id, group, status, title, found, rule?}`. Pure, fully unit tested.

### `src/app/api/preflight/route.ts`
POST handler, input validation, parallel fetches, 10 second timeouts, errors mapped to "Couldn't check".

### `src/app/page.tsx` and `src/components/Preflight.tsx`
Form, examples, results UI. PRD ref: `prd.md > Screens and Layout`.

## Data Model
No storage. Response shape: `{event: {title, url, rulesUrl, deadline, periodStart}, checks: Check[], criteria: {rules: Criterion[], overview: Criterion[], mismatch?: string}, eligibility: string[]}`.

## File Structure
```
preflight/
├── src/
│   ├── app/            # page, layout, api/preflight
│   ├── components/     # Preflight UI
│   └── lib/            # devpost, github, video, checks, text
├── test/fixtures/      # saved real Devpost pages for parser tests
├── devpost/            # Devpost Learn planning docs
└── README.md
```

## External Services and Dependencies
- Devpost event pages, `GET https://<event>.devpost.com/` and `/rules`, public HTML, no key.
- GitHub REST, `GET /repos/{owner}/{repo}` and `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`, no key, 60 requests per hour per IP (https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). Two calls per run.
- YouTube oEmbed `https://www.youtube.com/oembed?url=...&format=json` and Vimeo oEmbed `https://vimeo.com/api/oembed.json?url=...`, no key.

## Important Failure Modes
- **GitHub rate limit** → repo checks show "Couldn't check: GitHub's anonymous limit was reached, try again in a few minutes"; other checks still show.
- **Devpost changes its page template** → checks whose rule is not found say "This event's rules don't mention X" rather than guessing; parser tests catch it in development.
- **Slow upstream** → 10 second timeout per call.

## What Was Simplified and Why
- **Regex extraction** instead of an LLM or HTML parser library: deterministic, free, quotes exactly.
- **Public data only** instead of GitHub sign-in: the rules require public repos.

## Decisions and Open Issues
- Agent decision: no model calls at runtime (shared free quota with another project).
- Uncertainty discussed: whether YouTube length can be read without a key. Investigation: scraping the watch page gave inconsistent results from the box, so the spec uses oEmbed only and marks length "check yourself" for YouTube.
- Open: none.
