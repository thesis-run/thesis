import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Workspace from "./pages/app/Workspace";
import PortalView from "./pages/app/PortalView";
import DocView from "./pages/app/DocView";
import PortalSite from "./pages/published/PortalSite";
import { useStore, portalByDomain } from "./lib/store";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

/** At the apex, a request on a mapped custom domain renders that portal directly. */
function Root() {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const portal = useStore((s) => portalByDomain(s, host));
  return portal ? <PortalSite portalOverride={portal} /> : <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/app" element={<Workspace />} />
          <Route path="/app/p/:portalSlug" element={<PortalView />} />
          <Route path="/app/p/:portalSlug/:docSlug" element={<DocView />} />
          <Route path="/view/:portalSlug" element={<PortalSite />} />
          <Route path="/view/:portalSlug/:docSlug" element={<PortalSite />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
