import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownRenderer, extractHeadings } from "@/lib/markdown";
import DocumentationLayout, { type TocItem, type DocNavItem } from "@/components/DocumentationLayout";
import {
  useStore, portalBySlug, docsOfPortal, keysOfPortal, type Portal,
} from "@/lib/store";

/** Published portal — renders published snapshots in the petition-style documentation layout. */
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

  const tocItems: TocItem[] = useMemo(
    () => (active?.published ? extractHeadings(active.published).map((h) => ({ id: h.id, label: h.text, level: h.level })) : []),
    [active],
  );
  const docNav: DocNavItem[] = useMemo(
    () => (portal ? docs.map((d) => ({ id: d.id, label: d.title, href: `/view/${portal.slug}/${d.slug}`, active: active?.id === d.id })) : []),
    [docs, portal, active],
  );

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
      if (keys.some((k) => k.status === "active" && k.key === keyInput.trim())) {
        sessionStorage.setItem(unlockKey, "1");
        setUnlocked(true);
      } else setErr("Invalid access key");
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-4 w-4" />
            <h1 className="font-heading text-xl font-bold tracking-tight">{portal.name}</h1>
          </div>
          <p className="font-sans text-sm text-muted-foreground mb-4">This portal is private. Enter your access key.</p>
          <Input autoFocus value={keyInput} placeholder="tk_…" className="font-mono text-sm"
            onChange={(e) => { setKeyInput(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
          {err && <p className="text-destructive text-xs mt-2">{err}</p>}
          <Button className="w-full mt-3" onClick={submit} disabled={!keyInput.trim()}>Enter</Button>
        </div>
      </div>
    );
  }

  return (
    <DocumentationLayout
      portalName={portal.name}
      gated={portal.accessPolicy === "gated"}
      docNav={docNav}
      tocItems={tocItems}
    >
      {active?.published ? (
        <MarkdownRenderer md={active.published} />
      ) : (
        <p className="font-sans text-sm text-muted-foreground">Nothing published yet.</p>
      )}
    </DocumentationLayout>
  );
}
