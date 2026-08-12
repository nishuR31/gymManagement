import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-soft">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft">
            <AlertTriangle className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </h2>
          <p className="text-sm text-ink-muted mb-6 font-mono break-all">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-panel hover:bg-brand-dark transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-surface transition-colors"
            >
              <Home className="h-4 w-4" /> Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
