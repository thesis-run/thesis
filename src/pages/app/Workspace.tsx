import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Globe, Lock, FileText } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useStore,
  ensureWorkspace,
  createPortal,
  selectPortals,
  type AccessPolicy,
} from "@/lib/store";

export default function Workspace() {
  const navigate = useNavigate();
  const ws = useStore((s) => s.workspace) ?? ensureWorkspace();
  const portals = useStore(selectPortals);
  const docs = useStore((s) => s.docs);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [policy, setPolicy] = useState<AccessPolicy>("public");

  const create = () => {
    if (!name.trim()) return;
    const p = createPortal(name.trim(), policy);
    setOpen(false);
    setName("");
    navigate(`/app/p/${p.slug}`);
  };

  return (
    <AppShell crumbs={[{ label: ws.name }]}>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Portals</h1>
            <p className="font-sans text-sm text-muted-foreground mt-1">
              Each portal is a publishable collection of docs with its own access policy and domain.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New portal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">New portal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Input
                  autoFocus
                  placeholder="Portal name (e.g. Developer Docs)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && create()}
                />
                <div className="flex gap-2">
                  {(["public", "gated"] as AccessPolicy[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPolicy(p)}
                      className={`flex-1 rounded-md border p-3 text-left transition-colors ${
                        policy === p ? "border-foreground bg-muted/40" : "border-border hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-mono text-xs">
                        {p === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {p}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {p === "public" ? "Anyone with the link" : "Access keys required"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={!name.trim()}>
                  Create portal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {portals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-20 text-center">
            <FileText className="h-6 w-6 mx-auto text-muted-foreground/50" />
            <p className="font-sans text-sm text-muted-foreground mt-3">No portals yet.</p>
            <Button variant="link" onClick={() => setOpen(true)} className="mt-1">
              Create your first portal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {portals.map((p) => {
              const count = docs.filter((d) => d.portalId === p.id).length;
              return (
                <Link
                  key={p.id}
                  to={`/app/p/${p.slug}`}
                  className="rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-sm font-semibold">{p.name}</span>
                    {p.accessPolicy === "gated" ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>{count} {count === 1 ? "doc" : "docs"}</span>
                    <span className="text-muted-foreground/40">{p.key}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
