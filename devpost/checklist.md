---
doc: checklist
status: approved
---

# Preflight: Build Checklist

Build mode: fast. Run by the Hackathons agent; the learner checkpoints below were done by the agent against the live app, not by Joe, and are recorded that way.

## Slices

- [x] **Slice 1: Read a hackathon's rules**
  What: parse any Devpost event URL, fetch the overview and Official Rules pages, and extract title, deadline, period start, repo, video, new-project and file rules, criteria, and eligibility.
  PRD ref: `prd.md > Reading the rules`
  Spec ref: `spec.md > src/lib/devpost.ts`
  Verify (mechanical): `pnpm test` parser tests pass on saved pages from four real events (Build With AI: Basics, Amazon, Qloo, PayPal).
  Learner check: the Build With AI fixture yields the three planning files, a 3 minute limit, YouTube or Vimeo, and four criteria in the rules but three on the overview.
  Commit: `Read Devpost rules pages into structured, quotable rules`

- [x] **Slice 2: Check the repo and the video, build the rows**
  What: GitHub public API for visibility, license, dates, and files; oEmbed for the video; `buildChecks` combining rules and findings, each row quoting its rule.
  PRD ref: `prd.md > Repository checks`, `prd.md > Video checks`, `prd.md > Timing`
  Spec ref: `spec.md > src/lib/github.ts`, `spec.md > src/lib/video.ts`, `spec.md > src/lib/checks.ts`
  Verify (mechanical): unit tests for pass, fail, check-yourself and couldn't-check paths, including a rate-limited GitHub answer and a private YouTube video.
  Learner check: POST the three example inputs to `/api/preflight` locally and read the rows.
  Commit: `Check repos and videos against the quoted rules`

- [x] **Slice 3: The page**
  What: form, example buttons, results grouped Timing, Repository, Video; criteria with mismatch warning; eligibility chips; honest footer.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > src/components/Preflight.tsx`
  Verify (mechanical): typecheck, lint, build; screenshots at 1440 and 390 px with no horizontal overflow.
  Learner check: run each example and an invalid URL in the browser.
  Commit: `Preflight page: form, examples, grouped checks, criteria`

- [x] **Slice 4: Deploy**
  What: deploy to Vercel and run the examples against production.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Verify (mechanical): production `/api/preflight` returns the same rows as local for the three examples.
  Learner check: open the live URL on a phone-width viewport.
  Commit: `README, deploy notes`

## Hands-on Checkpoints

- [x] Early usable behavior explored: after slice 2, the API on the three examples (agent run)
- [x] Final kick-the-tires exploration and feedback completed (agent run, see Final Review)

## Final Review

- [x] Repeated rule quotes for each named file cluttered the list: merged into one row per event.
- [x] Quotes ended in "; and" when the rule was a list item: trimmed.
- [x] Final review complete: feedback resolved (agent review; Joe can still review before submitting)

## Code Tour and App Map

- [x] Learning activity complete: focused alternative (revisited the planning uncertainty about YouTube video length; the spec's decision held)
- [x] Optional edit and transfer reflection addressed: not applicable (no human learner in the loop)
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: `spec.md > Decisions and Open Issues` (YouTube length), `src/lib/video.ts` returns `durationSeconds: null` for YouTube and `src/lib/checks.ts` marks it check-yourself.
Route and stops: `src/app/api/preflight/route.ts` POST, `src/lib/devpost.ts` extractRules, `src/lib/checks.ts` buildChecks, `src/components/Preflight.tsx`.
Edit outcome: not applicable.
Reflection: not applicable.
Activity mode: focused alternative.

## Revisions

- Devpost answers 403 when the request sends `accept: text/html`, so page fetches send no accept header. Found when the first live request failed.
- Named files were one row each in the PRD; merged into one row because three identical quotes buried the other checks.
