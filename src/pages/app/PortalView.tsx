import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Plus, FileText, Globe, Lock, Copy, Trash2, KeyRound, ExternalLink, Check,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  useStore, portalBySlug, docsOfPortal, keysOfPortal,
  createDoc, createAccessKey, revokeAccessKey, updatePortal, addDomain, removeDomain, deletePortal,
} from "@/lib/store";

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {done ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function PortalView() {
  const { portalSlug = "" } = useParams();
  const navigate = useNavigate();
  const ws = useStore((s) => s.workspace);
  const portal = useStore((s) => portalBySlug(s, portalSlug));
  const docs = useStore((s) => (portal ? docsOfPortal(s, portal.id) : []));
  const keys = useStore((s) => (portal ? keysOfPortal(s, portal.id) : []));

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("");

  if (!portal) {
    return (
      <AppShell crumbs={[{ label: ws?.name ?? "Workspace", to: "/app" }, { label: "Not found" }]}>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="font-sans text-sm text-muted-foreground">Portal not found.</p>
          <Button variant="link" onClick={() => navigate("/app")}>← all portals</Button>
        </div>
      </AppShell>
    );
  }

  const create = () => {
    if (!title.trim()) return;
    const d = createDoc(portal.id, title.trim());
    setOpen(false); setTitle("");
    navigate(`/app/p/${portal.slug}/${d.slug}`);
  };

  return (
    <AppShell
      crumbs={[{ label: ws?.name ?? "Workspace", to: "/app" }, { label: portal.name }]}
      actions={
        <a href={`/view/${portal.slug}`} target="_blank" rel="noreferrer"
           className="font-mono text-xs tracking-wider inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors">
          View site <ExternalLink className="h-3 w-3" />
        </a>
      }
    >
      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Docs */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading text-xl font-bold tracking-tight">{portal.name}</h1>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New doc</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">New doc</DialogTitle></DialogHeader>
                <Input autoFocus placeholder="Doc title" value={title}
                  onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
                <DialogFooter><Button onClick={create} disabled={!title.trim()}>Create</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {docs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <FileText className="h-6 w-6 mx-auto text-muted-foreground/50" />
              <p className="font-sans text-sm text-muted-foreground mt-3">No docs yet.</p>
              <p className="font-mono text-[11px] text-muted-foreground/60 mt-2">
                Create one here, or let your agent add docs via the MCP.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Link to={`/app/p/${portal.slug}/${d.slug}`} className="flex-1 min-w-0">
                    <span className="font-sans text-sm truncate">{d.title}</span>
                  </Link>
                  {d.published ? (
                    <span className="font-mono text-[10px] text-accent">live</span>
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground/50">draft</span>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground/40">{d.key}</span>
                  <CopyBtn text={d.key} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-6">
          {/* Access */}
          <section>
            <p className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground mb-2">Access</p>
            <div className="flex gap-2">
              {(["public", "gated"] as const).map((p) => (
                <button key={p} onClick={() => updatePortal(portal.id, { accessPolicy: p })}
                  className={`flex-1 rounded-md border px-3 py-2 font-mono text-xs inline-flex items-center justify-center gap-1.5 transition-colors ${
                    portal.accessPolicy === p ? "border-foreground bg-muted/40" : "border-border hover:bg-muted/20"
                  }`}>
                  {p === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} {p}
                </button>
              ))}
            </div>
          </section>

          {/* Access keys */}
          {portal.accessPolicy === "gated" && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Access keys</p>
                <button onClick={() => createAccessKey(portal.id)} className="text-muted-foreground hover:text-foreground" title="New key">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {keys.filter((k) => k.status === "active").length === 0 && (
                  <p className="font-sans text-xs text-muted-foreground">No active keys.</p>
                )}
                {keys.filter((k) => k.status === "active").map((k) => (
                  <div key={k.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                    <KeyRound className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-mono text-[11px] truncate flex-1">{k.key}</span>
                    <CopyBtn text={k.key} />
                    <button onClick={() => revokeAccessKey(k.id)} className="text-muted-foreground hover:text-destructive" title="Revoke">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Domains */}
          <section>
            <p className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground mb-2">Custom domains</p>
            <div className="space-y-1.5">
              {portal.domains.map((d) => (
                <div key={d} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                  <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-mono text-[11px] truncate flex-1">{d}</span>
                  <button onClick={() => removeDomain(portal.id, d)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <Input value={domain} onChange={(e) => setDomain(e.target.value)}
                  placeholder="docs.acme.com" className="h-8 font-mono text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") { addDomain(portal.id, domain); setDomain(""); } }} />
                <Button size="sm" variant="outline" className="h-8"
                  onClick={() => { addDomain(portal.id, domain); setDomain(""); }}>Add</Button>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground/60 leading-relaxed">
                Point a CNAME to <span className="text-foreground">cname.thesis.run</span>; TLS provisions automatically.
              </p>
            </div>
          </section>

          <section>
            <button onClick={() => { if (confirm(`Delete portal "${portal.name}"?`)) { deletePortal(portal.id); navigate("/app"); } }}
              className="font-mono text-[11px] text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1.5">
              <Trash2 className="h-3 w-3" /> Delete portal
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
