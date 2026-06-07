import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

// Placeholder for the workspace app shell (built in the app phase).
const AppPlaceholder = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
    <span className="font-heading text-2xl font-bold tracking-tight">thesis</span>
    <p className="font-mono text-xs tracking-wider text-muted-foreground">
      The workspace is coming online.
    </p>
    <a href="/" className="font-mono text-xs tracking-wider underline underline-offset-4">
      ← back home
    </a>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app/*" element={<AppPlaceholder />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
