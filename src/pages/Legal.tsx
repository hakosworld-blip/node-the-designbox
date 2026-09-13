import { useEffect } from "react";
import { Link } from "react-router";

/** Shared shell for the Privacy Policy and Terms & Conditions pages. */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} · Node`;
    return () => {
      document.title =
        "Node — Collaborative interface design for modern product teams";
    };
  }, [title]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-sm font-bold uppercase tracking-[0.22em] text-foreground"
          >
            Node
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-foreground" to="/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" to="/dashboard">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Last updated {updated}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <div className="mt-8 space-y-8 [&_a]:text-violet-500 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:marker:text-muted-foreground [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:space-y-2 [&_ul]:text-muted-foreground">
          {children}
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <span className="font-bold uppercase tracking-[0.22em] text-foreground">
            Node
          </span>
          <nav className="flex gap-5">
            <Link className="hover:text-foreground" to="/privacy">
              Privacy Policy
            </Link>
            <Link className="hover:text-foreground" to="/terms">
              Terms &amp; Conditions
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
