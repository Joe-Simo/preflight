---
doc: prd
status: approved
---

# Preflight: Product Requirements

A pre-submit check for people entering online Devpost hackathons. Source: `scope.md > Who It's For`, `scope.md > The Unique Kernel`.

## The Core Journey
1. The entrant opens Preflight. They see one sentence on what it does, a three-field form, and two example buttons.
2. They paste the hackathon URL (any page on `<event>.devpost.com`), their GitHub repo URL, and optionally their video link.
3. They press Run preflight. A short loading state names what is being read ("Reading the Official Rules, checking the repo, checking the video").
4. The result opens with the event name, the deadline in their own time zone, and time left.
5. A summary line: how many checks pass, how many fail, how many are theirs to confirm.
6. The checks, grouped Repository, Video, Timing. Each row: status, a plain title, what Preflight found, and the rule it came from, quoted, with a link to the rules page.
7. Below: what the judges score (criteria from the Official Rules) and who can participate.
8. They fix a failing item and press Run again. Success is all checks passing or marked "check yourself".

Source: `scope.md > The Core Loop`.

## Screens and Layout
One page.
- Top: name, one-line purpose.
- Form: three labeled inputs stacked on mobile, a primary button, example buttons under it.
- Results: event header card; summary bar; grouped check list; criteria card; eligibility card; a footer line on what Preflight cannot check.

## Look and Feel
Dark, calm, checklist-like (`scope.md > Inspiration & Identity`). Green for pass, coral for fail, amber for check yourself. Quoted rule text in a monospace face with a left rule line. No illustrations, no gradients. Works at 390 px wide.

## Features and Behavior

### Reading the rules
- Accept any URL on a `*.devpost.com` event subdomain; derive the overview and `/rules` pages from it.
- Extract: event title, deadline (from the page's machine-readable date), submission period start, the paragraphs about the repository, the video, new versus existing projects, required file names, judging criteria (rules page and overview page), and the "Who can participate" list.
- If a rule is not found on the page, the related check says so instead of guessing.

### Repository checks (GitHub public API)
- Public: pass when the repo is readable without sign-in; fail when GitHub returns not found (private or missing look the same from outside, and the message says that).
- License: pass when GitHub detects an SPDX license; fail when none or unrecognized.
- New project: when the rules say projects must be newly created, pass when the repo was created on or after the submission period start, otherwise fail. When the rules allow existing projects, check the last push is after the start instead.
- Named files: for each file name the rules name (for example `scope.md`), pass when a file with that name exists anywhere in the repo.
- README: pass when a README exists at the root.

### Video checks
- Host: pass when the link host is one the rules allow (YouTube, Vimeo, Youku as named in the rules).
- Reachable: pass when the host's public oEmbed endpoint returns the video (private videos fail).
- Length: Vimeo reports duration, compare with the rules' limit. YouTube does not without an API key, so "check yourself" with the limit quoted.
- No video given: one "check yourself" row.

### Timing
- Deadline shown in the visitor's time zone with days and hours left; fail when it has passed.

### Criteria
- List criteria from the Official Rules. If the overview page lists a different set, show a warning naming the difference and the rules' own line that the Official Rules prevail.

- As an entrant with a private repo, I want to be told before I submit so that I do not fail Stage One.
  - [ ] Private or missing repo shows Fail with the event's repo rule quoted.
- As an entrant on this event, I want to know my planning files are where judges look.
  - [ ] Missing `spec.md` shows Fail naming the file.

## States and Boundaries
- **First use**: empty form, examples visible.
- **Loading**: button disabled, progress text.
- **Bad input**: inline message under the field ("Use a link to a Devpost hackathon, like https://learn-ai-basics.devpost.com").
- **Upstream error** (GitHub rate limit, Devpost unreachable): the affected checks show "Couldn't check" with the reason; the rest still render.
- **Nothing stored**: no accounts, no history.

## Product Decisions
- Quote rules instead of summarizing them: the kernel; a paraphrase can be wrong.
- No LLM: parsing is deterministic and free. (Agent decision under Joe's instruction to cap free-model usage.)
- Treat private and missing repos the same: that is all GitHub reveals without sign-in.

## What We're Building
Everything in Features and Behavior, on one live page, with tests on the parser using saved copies of real rules pages.

## Deferred From the POC
- Saved runs and share links (needs storage).
- GitLab and Bitbucket (more APIs).

## Possible Later Enhancements
- A GitHub Action that runs Preflight on each push.
- Checking the Devpost project page fields.

## Non-Goals
- Writing or grading the submission text.
- Judging eligibility for the person: we show the list, they decide.

## Open Questions
None blocking.
