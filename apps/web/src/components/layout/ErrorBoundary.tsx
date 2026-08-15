import { Component, ReactNode } from "react";
import { Button } from "../ui/Button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error) {
    console.error("Uncaught error:", error);
    
    // Automatically attempt a reload on chunk load errors (often caused by stale builds)
    if (
      error.name === "ChunkLoadError" ||
      error.message.includes("dynamically imported module") ||
      error.message.includes("Failed to fetch dynamically imported module")
    ) {
      this.clearCacheAndReload();
    }
  }

  private clearCacheAndReload = () => {
    // Only clear session storage to prevent getting stuck, but keep localStorage
    // intact so user tokens and themes aren't wiped.
    sessionStorage.clear();
    
    // Hard reload
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
          <div className="card-base grid max-w-md gap-4 p-8 text-center animate-fade-in">
            <h1 className="text-2xl font-black text-foreground">Something went wrong</h1>
            <p className="text-sm font-semibold text-muted-foreground">
              The application encountered an unexpected error. If this persists, it may be due to a stale cache from a recent update.
            </p>
            <div className="mt-4 flex justify-center">
              <Button onClick={this.clearCacheAndReload} className="btn-primary h-11 px-6">
                Clear Cache & Reload App
              </Button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 text-left text-xs bg-card p-4 overflow-auto rounded text-muted-foreground border border-border">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
