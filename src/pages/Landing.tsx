import { Link } from "react-router-dom";
import { ArrowRight, FileText, Lock, Globe, GitBranch } from "lucide-react";

const GITHUB_URL = "https://github.com/thesis-run/thesis";

/**
 * Thesis landing — centered, minimal, typographic.
 * Monochrome + red accent · Chakra Petch headings / Inter body / Space Mono mono.
 */
const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 relative overflow-hidden">
      {/* subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(0 0% 0% / 0.04) 1px, transparent 1px), linear-gradient(to bottom, hsl(0 0% 0% / 0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* nav */}
      <nav className="w-full max-w-5xl flex items-center justify-between py-5 relative z-10">
        <span className="font-heading text-lg font-bold tracking-tight">thesis</span>
        <div className="flex items-center gap-5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <Link
            to="/app"
            className="font-mono text-xs tracking-wider px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <main className="w-full max-w-3xl flex-1 flex flex-col items-center text-center pt-20 relative z-10">
        {/* hero */}
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-6">
          Open-core · MCP-native
        </p>
        <h1 className="font-heading text-5xl sm:text-7xl font-bold tracking-tight leading-[1.02] max-w-3xl">
          Docs Portal for the
          <br />
          <span className="text-accent">AI Age</span>
        </h1>
        <p className="font-sans text-base text-muted-foreground leading-relaxed mt-7 max-w-xl">
          Your agent writes the docs. Thesis structures, gates, renders, and ships them as a
          portal on your own domain.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
          <Link
            to="/app"
            className="font-mono text-xs tracking-wider px-6 py-3 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs tracking-wider px-6 py-3 rounded-md border border-border hover:bg-muted/50 transition-colors inline-flex items-center gap-2"
          >
            View on GitHub
          </a>
        </div>
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground/60 mt-4">
          Open-core · self-hostable · public portals free
        </p>

        {/* app mockup: editor -> portal */}
        <div className="w-full mt-16 grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-3 h-8 border-b border-border bg-muted/40">
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="font-mono text-[10px] text-muted-foreground">getting-started.md</span>
            </div>
            <pre className="p-4 font-mono text-[11px] leading-relaxed text-muted-foreground overflow-hidden">
{`# Getting Started

Welcome to the Acme developer
platform.

:::video{src="demo.mp4"}

## Quickstart
- Install the SDK
- Authenticate
- Ship`}
            </pre>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-3 h-8 border-b border-border bg-muted/40">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-[10px] text-muted-foreground">docs.acme.com</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="h-3 w-2/3 rounded bg-foreground/80" />
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-2 w-5/6 rounded bg-muted" />
              <div className="h-16 w-full rounded bg-accent/10 border border-accent/20 flex items-center justify-center">
                <span className="font-mono text-[9px] text-accent">▶ video</span>
              </div>
              <div className="h-2 w-1/2 rounded bg-foreground/60 mt-2" />
              <div className="h-2 w-full rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* how it works */}
        <div className="w-full mt-24">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-8">
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              { icon: GitBranch, t: "Write anywhere", d: "Your agent drafts markdown into a git repo — or paste/import it. Thesis ingests it." },
              { icon: FileText, t: "Structure & render", d: "Organize docs into portals, drop in video & components, and render them beautifully." },
              { icon: Lock, t: "Gate & publish", d: "Issue access keys, point your domain, and publish a snapshot that stays live." },
            ].map(({ icon: Icon, t, d }, i) => (
              <div key={i} className="space-y-2">
                <Icon className="h-5 w-5 text-foreground" />
                <p className="font-heading text-sm font-semibold">{t}</p>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* pricing teaser */}
        <div className="w-full mt-20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-border p-5">
            <p className="font-mono text-xs tracking-wider text-muted-foreground">Public</p>
            <p className="font-heading text-2xl mt-1">Free</p>
            <p className="font-sans text-xs text-muted-foreground mt-2">
              Public portals on a thesis.run subdomain. Self-host the open engine.
            </p>
          </div>
          <div className="rounded-lg border border-border p-5 bg-muted/20">
            <p className="font-mono text-xs tracking-wider text-foreground">Gated</p>
            <p className="font-heading text-2xl mt-1">Your domain</p>
            <p className="font-sans text-xs text-muted-foreground mt-2">
              Access keys, custom domains, and audit — for confidential business docs.
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-5xl text-center py-10 relative z-10">
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground/60">
          © 2026 Thesis · the structure, access &amp; hosting layer for AI-authored docs
        </p>
      </footer>
    </div>
  );
};

export default Landing;
