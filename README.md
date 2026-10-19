# Preflight

Check your Devpost hackathon entry against that event's own Official Rules, before the judges do.

Paste a Devpost hackathon link, your GitHub repo, and your demo video. Preflight reads the event's overview and Official Rules pages, tests your links against them, and quotes the rule sentence behind every check.

Live: https://preflight-silk.vercel.app

## What it checks

| Group | Check | How |
|---|---|---|
| Timing | Submissions are open, time left in your zone | the event page's machine-readable deadline |
| Repository | Repository is public | GitHub public API (private and missing look the same from outside) |
| Repository | Open source license is detected | GitHub's license detection, the same one that fills the About section |
| Repository | Project is new for this event (or updated, if the rules allow existing projects) | repo creation and last push dates against the Submission Period start |
| Repository | Files the rules name (for example scope.md, prd.md, spec.md) | the repo's file tree |
| Repository | README at the root | the repo's file tree |
| Video | Host is one the rules allow | the rules' own list (YouTube, Vimeo, Youku) |
| Video | Publicly viewable | YouTube or Vimeo oEmbed |
| Video | Under the time limit | Vimeo reports length; YouTube does not without a key, so you confirm it |

It also lists what the judges score, from the Official Rules, and warns when the overview page shows a different set of criteria. Build With AI: Basics is an example: its overview lists three criteria, its Official Rules score four.

## What it does not do

- It reads public pages only. No sign-in, nothing stored.
- It can't tell unlisted from public on YouTube, and can't read YouTube video length.
- It doesn't judge eligibility for you. It shows the event's list so you can confirm it.
- It doesn't write or grade your submission text.
- It works with `*.devpost.com` events and GitHub repos only.
- Rules are read with plain text matching, not a language model. If a rule isn't found, the related check says so instead of guessing.

## Run it

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # parser and check tests, on saved copies of four real rules pages
pnpm typecheck && pnpm lint && pnpm build
```

No API keys. GitHub's anonymous API allows 60 requests per hour per IP; each run uses two.

## How it works

```
page (src/components/Preflight.tsx)
  POST /api/preflight {hackathon, repo, video}
    src/lib/devpost.ts  fetch / and /rules, extract quotable rules
    src/lib/github.ts   GET /repos/{o}/{r}, GET /git/trees/{branch}?recursive=1
    src/lib/video.ts    YouTube or Vimeo oEmbed
    src/lib/checks.ts   rules + findings -> rows {status, title, found, rule}
```

## How it was built

Planned and built with the [Devpost Learn skill pack](https://github.com/challengepost/learn-ai-basics) for Build With AI: Basics. The planning documents are in [`devpost/`](devpost): [scope](devpost/scope.md), [PRD](devpost/prd.md), [spec](devpost/spec.md), [build checklist](devpost/checklist.md), and an [app map](devpost/app-map.html).

AI use: Joe Simo's autonomous hackathon agent ran the skill pack end to end, playing both the interviewer and the learner from Joe's standing instructions, and wrote the code, tests, and docs. This is stated in the planning files too.

Not made by or affiliated with Devpost.

## License

MIT
