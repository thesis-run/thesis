import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownRenderer, extractHeadings } from "@/lib/markdown";
import {
  useStore, portalBySlug, docsOfPortal, keysOfPortal, type Portal,
} from "@/lib/store";

/**
 * Published portal — the reader-facing site. Renders published snapshots in a clean
 * TOC + scroll-spy layout. Gated portals require a valid access key.
 */
export default function PortalSite({ portalOverride }: { portalOverride?: Portal }) {
  const { portalSlug = "", docSlug } = useParams();
  const portal = useStore((s) => portalOverride ?? portalBySlug(s, portalSlug));
  const allDocs = useStore((s) => (portal ? docsOfPortal(s, portal.id) : []));
  const keys = useStore((s) => (portal ? keysOfPortal(s, portal.id) : []));
  const docs = useMemo(() => allDocs.filter((d) => d.published), [allDocs]);

  const unlockKey = portal ? `thesis:unlocked:${portal.id}` : "";
  const [unlocked, setUnlocked] = useState(() =>
    portal ? portal.accessPolicy === "public" || sessionStorage.getItem(unlockKey) === "1" : false,
  );
  const [keyInput, setKeyInput] = useState("");
  const [err, setErr] = useState("");

  const active = useMemo(() => {
    if (!docs.length) return undefined;
    return docs.find((d) => d.slug === docSlug) ?? docs[0];
  }, [docs, docSlug]);

  const headings = useMemo(() => (active?.published ? extractHeadings(active.published) : []), [active]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (!headings.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActiveId(vis[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    headings.forEach((h) => { const el = document.getElementById(h.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [headings, active?.id]);

  if (!portal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-background">
        <p className="font-mono text-sm text-muted-foreground">Portal not found.</p>
        <Link to="/" className="font-mono text-xs underline underline-offset-4">← thesis</Link>
      </div>
    );
  }

  if (!unlocked) {
    const submit = () => {
      const ok = keys.some((k) => k.status === "active" && k.key === keyInput.trim());
      if (ok) { sessionStorage.setItem(unlockKey, "1"); setUnlocked(true); }
      else setErr("Invalid access key");
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-4 w-4" />
            <h1 className="font-heading text-xl font-bold tracking-tight">{portal.name}</h1>
          </div>
          <p className="font-sans text-sm text-muted-foreground mb-4">This portal is private. Enter your access key.</p>
          <Input autoFocus value={keyInput} placeholder="tk_…"
            onChange={(e) => { setKeyInput(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} className="font-mono text-sm" />
          {err && <p className="text-destructive text-xs mt-2">{err}</p>}
          <Button className="w-full mt-3" onClick={submit} disabled={!keyInput.trim()}>Enter</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center gap-3">
          <span className="font-heading text-sm font-bold tracking-tight">{portal.name}</span>
          {portal.accessPolicy === "gated" && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-border min-h-[calc(100vh-3.5rem)] p-6">
          <p className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-3">Docs</p>
          <nav className="space-y-1 mb-8">
            {docs.map((d) => (
              <Link key={d.id} to={`/view/${portal.slug}/${d.slug}`}
                className={`block font-sans text-sm py-1 transition-colors ${
                  active?.id === d.id ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}>
                {d.title}
              </Link>
            ))}
          </nav>
          {headings.length > 0 && (
            <>
              <p className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-3">On this page</p>
              <nav className="space-y-1">
                {headings.map((h) => (
                  <a key={h.id} href={`#${h.id}`}
                    className={`block font-sans text-xs py-0.5 transition-colors ${h.level === 2 ? "pl-3" : ""} ${
                      activeId === h.id ? "text-accent" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {h.text}
                  </a>
                ))}
              </nav>
            </>
          )}
        </aside>

        {/* content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-12">
          {active?.published ? (
            <article className="max-w-3xl">
              <MarkdownRenderer md={active.published} />
            </article>
          ) : (
            <p className="font-sans text-sm text-muted-foreground">Nothing published yet.</p>
          )}
        </main>
      </div>
    </div>
  );
}
