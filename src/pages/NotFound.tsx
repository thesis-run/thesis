import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    <p className="font-mono text-5xl font-bold tracking-tight">404</p>
    <p className="font-sans text-sm text-muted-foreground">This page doesn't exist.</p>
    <Link
      to="/"
      className="font-mono text-xs tracking-wider underline underline-offset-4 hover:text-foreground transition-colors"
    >
      ← back home
    </Link>
  </div>
);

export default NotFound;
