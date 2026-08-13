import { Link, Outlet } from "react-router-dom";
import { ChevronUp, Dumbbell, Settings, Smartphone } from "lucide-react";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-transparent backdrop-blur-xs text-foreground flex flex-col">
      <header className="layout-header">
        <Link className="flex items-center gap-3 text-foreground focus-visible:focus-ring rounded-md" to="/" tabIndex={0}>
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-panel">
            <Dumbbell className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-black uppercase tracking-[0.18em] text-primary-foreground">ValorFitness</span>
            <span className="hidden md:block text-xs font-semibold text-muted-foreground">Iron & Chalk Training Club</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link className="hidden md:inline-flex rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-panel/10 hover:text-foreground focus-visible:focus-ring" to="/plans" tabIndex={0}>Plans</Link>
          <Link className="hidden md:inline-flex rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-panel/10 hover:text-foreground focus-visible:focus-ring" to="/member-login" tabIndex={0}>Member Login</Link>
          <Link className="hidden md:inline-flex rounded-md border border-border bg-panel/10 px-3 py-2 text-sm font-bold text-foreground transition hover:border-brand focus-visible:focus-ring" to="/login" tabIndex={0}>Admin</Link>
          <Link className="p-2 text-muted-foreground hover:text-primary transition rounded-md focus-visible:focus-ring" to="/settings" aria-label="Settings" tabIndex={0}>
            <Settings
              className="
                h-6 w-6
                transition-transform
                duration-500
                ease-in-out
                hover:rotate-180
              "
            />
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="layout-footer">
        <div className="mx-auto max-w-screen px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm font-semibold text-muted-foreground">
            &copy; {new Date().getFullYear()} ValorFitness. All rights reserved.
          </p>
          <nav className="flex items-center flex-wrap gap-4 md:gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/owner" className="hover:text-primary transition focus-visible:focus-ring rounded" tabIndex={0}>Owner</Link>
            <Link to="/privacy" className="hover:text-primary transition focus-visible:focus-ring rounded" tabIndex={0}>Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition focus-visible:focus-ring rounded" tabIndex={0}>Terms of Service</Link>
            <Link
              to="/download-app"
              tabIndex={0}
              className="flex items-center gap-1 rounded-2xl bg-primary p-2 pr-3 text-sm font-bold text-muted shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:focus-ring hover:bg-primary/90 animate-slide-up"
              aria-label="Download our App"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-panel/20">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </div>
              <span>Download App</span>
            </Link>
            <ChevronUp className="font-extrabold bg-transparent text-[clamp(3rem,6vw,5rem)] backdrop-blur-sm text-muted-foreground rounded cursor-pointer animate-bounce mx-2 focus-visible:focus-ring " onClick={() => globalThis.scrollTo({ top: 0, behavior: "smooth" })} />
          </nav>

        </div>
      </footer>

      {/* Download App Pill */}

    </div>
  );
}
