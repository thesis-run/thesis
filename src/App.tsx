import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";

import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Login from "./pages/app/Login";
import Workspace from "./pages/app/Workspace";
import PortalView from "./pages/app/PortalView";
import DocView from "./pages/app/DocView";
import PortalSite from "./pages/published/PortalSite";
import { AuthProvider, useAuth } from "./contexts/auth";
import { hydrate, hydratePublic } from "./lib/store";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } } });

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <span className="font-mono text-xs tracking-wider text-muted-foreground">loading…</span>
    </div>
  );
}

/** Authenticated app routes: require a session, then hydrate the workspace. */
function AppGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (session) hydrate().then(() => setReady(true));
    else setReady(false);
  }, [session]);
  if (loading) return <Spinner />;
  if (!session) return <Login />;
  if (!ready) return <Spinner />;
  return <>{children}</>;
}

/** Published portal: owners read from their hydrated workspace; anon loads the public portal. */
function PublishedGate() {
  const { session, loading } = useAuth();
  const { portalSlug } = useParams();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      setReady(false);
      if (session) await hydrate();
      else await hydratePublic({ slug: portalSlug });
      setReady(true);
    })();
  }, [session, portalSlug]);
  if (loading || !ready) return <Spinner />;
  return <PortalSite />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppGate><Workspace /></AppGate>} />
            <Route path="/app/p/:portalSlug" element={<AppGate><PortalView /></AppGate>} />
            <Route path="/app/p/:portalSlug/:docSlug" element={<AppGate><DocView /></AppGate>} />
            <Route path="/view/:portalSlug" element={<PublishedGate />} />
            <Route path="/view/:portalSlug/:docSlug" element={<PublishedGate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
