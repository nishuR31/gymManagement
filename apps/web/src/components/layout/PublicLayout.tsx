import { Link, NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { APP_NAME } from "../../utils/env";
import { ChevronUp, Dumbbell, Settings, Smartphone, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logoutThunk } from "../../features/auth/authSlice";

export function PublicLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const status = useAppSelector((state) => state.auth.status);
  const dispatch = useAppDispatch();

  return (
    <div className="min-h-screen bg-transparent backdrop-blur-xs text-foreground flex flex-col">
      <header className="layout-header relative z-50">
        <Link className="flex items-center gap-3 text-foreground focus-visible:focus-ring rounded-md" to="/" tabIndex={0}>
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Dumbbell className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-black uppercase tracking-[0.18em] text-foreground">{APP_NAME}</span>
            <span className="hidden md:block text-xs font-semibold text-muted-foreground">Iron & Chalk Training Club</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          {/* Desktop Nav */}
          <Link className="hidden md:inline-flex rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-card/10 hover:text-foreground focus-visible:focus-ring" to="/features" tabIndex={0}>Features</Link>
          <Link className="hidden md:inline-flex rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-card/10 hover:text-foreground focus-visible:focus-ring" to="/plans" tabIndex={0}>Plans</Link>
          {status === "authenticated" ? (
            <>
              <Link className="hidden md:inline-flex rounded-md border border-border bg-card/10 px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary focus-visible:focus-ring items-center" to="/dashboard" tabIndex={0}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              <button onClick={() => void dispatch(logoutThunk())} className="hidden md:inline-flex rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-card/10 hover:text-foreground focus-visible:focus-ring items-center" tabIndex={0}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="hidden md:inline-flex rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-card/10 hover:text-foreground focus-visible:focus-ring" to="/member-login" tabIndex={0}>Member Login</Link>
              <Link className="hidden md:inline-flex rounded-md border border-border bg-card/10 px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary focus-visible:focus-ring" to="/login" tabIndex={0}>Admin</Link>
            </>
          )}
          <Link className="hidden md:inline-flex p-2 text-muted-foreground hover:text-primary transition rounded-md focus-visible:focus-ring" to="/settings" aria-label="Settings" tabIndex={0}>
            <Settings className="h-6 w-6 transition-transform duration-500 ease-in-out hover:rotate-180" />
          </Link>
          
          {/* Mobile Hamburger Toggle */}
          <button 
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition rounded-md focus-visible:focus-ring"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>
      </header>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-[73px] bottom-0 z-40 bg-background/95 backdrop-blur-md md:hidden animate-fade-in flex flex-col p-6 gap-4">
          <Link onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-4 rounded-lg bg-card/50 border border-border text-lg font-bold text-foreground hover:bg-card hover:border-primary transition" to="/features">Features</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-4 rounded-lg bg-card/50 border border-border text-lg font-bold text-foreground hover:bg-card hover:border-primary transition" to="/plans">Plans</Link>
          {status === "authenticated" ? (
            <>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-4 rounded-lg bg-card/50 border border-border text-lg font-bold text-foreground hover:bg-card hover:border-primary transition gap-3" to="/dashboard">
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
              <button onClick={() => { setIsMobileMenuOpen(false); void dispatch(logoutThunk()); }} className="flex items-center px-4 py-4 rounded-lg bg-card/50 border border-border text-lg font-bold text-foreground hover:bg-card hover:border-primary transition gap-3 text-left">
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-4 rounded-lg bg-card/50 border border-border text-lg font-bold text-foreground hover:bg-card hover:border-primary transition" to="/member-login">Member Login</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-4 rounded-lg bg-card/50 border border-border text-lg font-bold text-foreground hover:bg-card hover:border-primary transition" to="/login">Admin Login</Link>
            </>
          )}
          <Link onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-4 rounded-lg bg-card/50 border border-border text-lg font-bold text-foreground hover:bg-card hover:border-primary transition gap-3" to="/settings">
            <Settings className="h-5 w-5" />
            System Settings
          </Link>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="layout-footer">
        <div className="mx-auto max-w-screen px-6 flex flex-col md:flex-row items-center justify-around gap-4">
          <p className="text-sm font-semibold text-muted-foreground">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <nav className="flex items-center flex-wrap gap-4 md:gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/features" className="hover:text-primary transition focus-visible:focus-ring rounded" tabIndex={0}>Features</Link>
            <Link to="/owner" className="hover:text-primary transition focus-visible:focus-ring rounded" tabIndex={0}>Owner</Link>
            <Link to="/privacy" className="hover:text-primary transition focus-visible:focus-ring rounded" tabIndex={0}>Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition focus-visible:focus-ring rounded" tabIndex={0}>Terms of Service</Link>
            <Link
              to="/download-app"
              tabIndex={0}
              className="btn-base btn-primary animate-slide-up rounded-full pl-2 pr-4"
              aria-label="Download our App"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-background/20">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </div>
              <span>Download App</span>
            </Link>
          </nav>
        </div>
      </footer>

      <button
        onClick={() => globalThis.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed btn-base bottom-6 right-6 z-50 rounded-full bg-background outline outline-border p-3 text-muted-foreground shadow-lg backdrop-blur-md transition-all hover:-translate-y-1 hover:text-foreground hover:shadow-xl focus-visible:focus-ring"
        aria-label="Scroll to top"
      >
        <ChevronUp className="h-6 w-6 font-extrabold animate-bounce" />
      </button>

      {/* Download App Pill */}

    </div>
  );
}
