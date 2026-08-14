import { Link } from "react-router-dom";
import { Dumbbell, HardDrive, Moon, RefreshCw, Sun, MoonStar, Palette } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useTheme } from "../hooks/useTheme";

export function PublicSettingsPage() {
  const { theme, setTheme, styleMode, setStyleMode } = useTheme();

  const handleClearCache = () => {
    // Preserve theme preference if possible
    const theme = localStorage.getItem("gymos-theme");
    
    // Clear all local and session storage
    localStorage.clear();
    sessionStorage.clear();
    
    if (theme) {
      localStorage.setItem("gymos-theme", theme);
    }
    
    // Hard reload
    window.location.reload();
  };

  return (
    <div className="w-full animate-fade-in">

      <section className="mx-auto max-w-3xl px-6 py-12 animate-fade-in">
        <h1 className="text-4xl font-black text-foreground mb-8">System Settings</h1>
        
        <div className="grid gap-6">
          <div className="p-6 rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-md border border-primary/20">
                {theme === "amoled" ? <MoonStar className="h-6 w-6" /> : theme === "dark" ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">Color Scheme</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Switch between light and dark mode.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")} className="flex-1 min-w-[100px]">
                    Light
                  </Button>
                  <Button variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")} className="flex-1 min-w-[100px]">
                    Dark
                  </Button>
                  <Button variant={theme === "amoled" ? "primary" : "secondary"} onClick={() => setTheme("amoled")} className="flex-1 min-w-[120px]">
                    AMOLED (Beta)
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-md border border-primary/20">
                <Palette className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">Styling Paradigm</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Change the overall shape and feel of UI components.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant={styleMode === "minimal" ? "primary" : "secondary"} onClick={() => setStyleMode("minimal")}>
                    Minimalist (Default)
                  </Button>
                  <Button variant={styleMode === "glass" ? "primary" : "secondary"} onClick={() => setStyleMode("glass")}>
                    Glassmorphism
                  </Button>
                  <Button variant={styleMode === "clay" ? "primary" : "secondary"} onClick={() => setStyleMode("clay")}>
                    Claymorphism
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-md border border-primary/20">
                <HardDrive className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">Troubleshooting & Cache</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  If you are experiencing issues with the app, such as pages not loading properly or stale data, clearing your local cache can force the app to download the latest updates. You will need to log in again after doing this.
                </p>
                <Button onClick={handleClearCache} className="flex items-center gap-2 px-5">
                  <RefreshCw className="h-4 w-4" />
                  Clear Cache & Reload
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
