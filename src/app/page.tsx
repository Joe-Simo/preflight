import { Preflight } from "@/components/Preflight";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[880px] px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8">
        <div className="mb-5 flex items-center gap-2 text-sm font-medium tracking-wide text-ok">
          <svg aria-hidden viewBox="0 0 32 32" className="h-5 w-5"><path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Preflight
        </div>
        <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight sm:text-[40px]">Check your Devpost entry against the event&apos;s own rules.</h1>
        <p className="mt-3 max-w-[640px] text-[17px] leading-relaxed text-mute">
          Paste the hackathon, your repo, and your video. Preflight reads that event&apos;s Official Rules and tests your links against them. Every check quotes the rule it comes from.
        </p>
      </header>
      <Preflight />
      <footer className="mt-16 border-t border-line pt-6 text-sm leading-relaxed text-mute">
        Preflight reads public pages only: the event&apos;s Devpost pages, GitHub&apos;s public API, and YouTube or Vimeo oEmbed. It can&apos;t see private repos, can&apos;t tell unlisted from public on YouTube, and can&apos;t read YouTube video length. Nothing is stored. Not made by or affiliated with Devpost.{" "}
        <a className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink" href="https://github.com/Joe-Simo/preflight">Source on GitHub</a>
      </footer>
    </main>
  );
}
