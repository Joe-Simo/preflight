---
doc: scope
status: approved
---

# Preflight

A pre-submit check for Devpost hackathons: paste the hackathon, your repo, and your video, and see which of the event's own rules you would fail, before the judges do.

> How this plan was made: this project was planned with the Devpost Learn skill pack by Joe Simo's autonomous hackathon agent, which ran both sides of the interview (it asked, and it answered from Joe's standing instructions and its own research). Approvals in these files are the agent's, recorded under Joe's instruction to work on its own. Nothing here claims Joe answered a question he did not.

## The Unique Kernel
Every check quotes the exact rule sentence it comes from, pulled live from that hackathon's Official Rules page, and then tests your real repo and video against it. Not a generic "did you add a README" list: it is this event's rules, checked against your links.

## Who It's For
A solo developer or small team about to submit to an online Devpost hackathon, usually in the last few hours, often after a weekend of building. Today they skim a long legal rules page, guess at what "must be public" and "license detectable in the About section" mean, and find out in Stage One that they missed one.

Why it matters: a Databricks judge wrote that they were "surprised to see how many submissions did not fulfill the basic requirements" (Devpost blog, "Advice from 5 seasoned judges"). Stage One of this very event is pass/fail on requirements.

## The Core Loop
1. Paste a Devpost hackathon URL, a GitHub repo URL, and (optionally) a YouTube or Vimeo link.
2. Press Run preflight.
3. Read a short list of checks: pass, fail, or check yourself, each with what was found and the rule it came from.
4. Fix the failing item (make the repo public, add a LICENSE, add the missing file), run it again, watch it turn green.

People come back on the next hackathon, or after each fix.

## Inspiration & Identity
A pilot's preflight checklist: calm, short, unambiguous. Each line either clears or does not. Quiet dark interface, one accent color for pass and one for fail, monospace for quoted rule text. References: aviation checklists; GitHub's own status checks UI.

## Why This Matters to the Learner
Joe enters several Devpost hackathons at once. Every entry this month had a requirement that was easy to miss (public video host, detectable license, repo visibility at submit time, planning files). One missed line costs the whole entry.

## What "Working" Looks Like
On the live site, paste this event (Build With AI: Basics) and a private repo: Preflight shows "Repository is public: fail" next to the rule "The repository must be public". Paste a public repo with an MIT LICENSE and the three planning files: those checks pass, each quoting its rule. The "oh, that's cool" beat: it notices that this event's overview page lists three judging criteria while its Official Rules list four, and tells you the rules prevail.

## The POC Boundary
- Devpost hackathons only (`*.devpost.com`).
- GitHub repos only, public data only, no sign-in.
- Checks: deadline and time left; repo public; license detected by GitHub; repo created inside the submission period (or updated, when the rules allow existing projects); files the rules name (for example scope.md); README present; video host allowed; video publicly reachable; video length when the host reports it.
- Judging criteria from both pages, with a mismatch warning.
- Who can participate, shown as "check yourself".

## Later
- GitLab and Bitbucket repos.
- A shareable result link.
- Checking the Devpost project page itself once it exists.

## Explicitly Cut
- LLM reading of the rules: the rules pages share one template, so plain parsing is faster, free, and never makes things up. An LLM could misquote a rule, which defeats the kernel.
- Sign-in with GitHub for private repos: the rules require a public repo anyway, so a private repo is the failure we want to show.
- Writing the submission text for you: out of scope and against the spirit of this event.
