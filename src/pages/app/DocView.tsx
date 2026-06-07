import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Copy, ExternalLink, Rocket } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/lib/markdown";
import {
  useStore, portalBySlug, docBySlug, updateDocDraft, publishDoc,
} from "@/lib/store";

export default function DocView() {
  const { portalSlug = "", docSlug = "" } = useParams();
  const navigate = useNavigate();
  const ws = useStore((s) => s.workspace);
  const portal = useStore((s) => portalBySlug(s, portalSlug));
  const doc = useStore((s) => (portal ? docBySlug(s, portal.id, docSlug) : undefined));

  const [draft, setDraft] = useState(doc?.draft ?? "");
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (doc) setDraft(doc.draft); }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // autosave drafts (debounced)
  useEffect(() => {
    if (!doc || draft === doc.draft) return;
    const t = setTimeout(() => updateDocDraft(doc.id, draft), 400);
    return () => clearTimeout(t);
  }, [draft, doc]);

  if (!portal || !doc) {
    return (
      <AppShell crumbs={[{ label: ws?.name ?? "Workspace", to: "/app" }, { label: "Not found" }]}>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="font-sans text-sm text-muted-foreground">Doc not found.</p>
          <Button variant="link" onClick={() => navigate("/app")}>← all portals</Button>
        </div>
      </AppShell>
    );
  }

  const dirty = doc.published !== draft;
  const liveUrl = `/view/${portal.slug}/${doc.slug}`;

  return (
    <AppShell
      crumbs={[
        { label: ws?.name ?? "Workspace", to: "/app" },
        { label: portal.name, to: `/app/p/${portal.slug}` },
        { label: doc.title },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(doc.key); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
            className="font-mono text-[11px] tracking-wider inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors"
            title="Copy doc key for your agent"
          >
            {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />} {doc.key}
          </button>
          {doc.published && (
            <a href={liveUrl} target="_blank" rel="noreferrer"
               className="font-mono text-[11px] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors">
              Live <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Button size="sm" className="gap-1.5" disabled={!dirty} onClick={() => publishDoc(doc.id)}>
            <Rocket className="h-3.5 w-3.5" /> {doc.published ? (dirty ? "Publish changes" : "Published") : "Publish"}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 h-[calc(100vh-3rem)] divide-x divide-border">
        {/* Source */}
        <div className="flex flex-col min-h-0">
          <div className="h-8 px-4 flex items-center border-b border-border bg-muted/30">
            <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">Source · markdown</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">{dirty ? "unpublished changes" : "in sync"}</span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="flex-1 resize-none bg-background p-5 font-mono text-[13px] leading-relaxed outline-none"
            placeholder="# Title&#10;&#10;Write markdown… :::callout{type=info} … :::"
          />
        </div>
        {/* Preview */}
        <div className="flex flex-col min-h-0">
          <div className="h-8 px-4 flex items-center border-b border-border bg-muted/30">
            <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">Preview</span>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            <MarkdownRenderer md={draft} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
