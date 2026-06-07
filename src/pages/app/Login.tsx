import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !pw) return;
    setBusy(true);
    setErr("");
    const { error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
        : await supabase.auth.signUp({ email: email.trim(), password: pw });
    if (error) setErr(error.message);
    setBusy(false);
    // success → AuthProvider's onAuthStateChange swaps the gate to the app.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-heading text-2xl font-bold tracking-tight">thesis</Link>
        <p className="font-sans text-sm text-muted-foreground mt-2 mb-8">
          {mode === "in" ? "Sign in to your workspace." : "Create your workspace."}
        </p>

        <div className="space-y-3">
          <Input type="email" placeholder="you@company.com" value={email} autoFocus
            onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
          <Input type="password" placeholder="Password" value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
          {err && <p className="text-destructive text-xs">{err}</p>}
          <Button className="w-full" onClick={submit} disabled={busy || !email.trim() || !pw}>
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </div>

        <button
          onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}
          className="mt-5 font-mono text-[11px] tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
