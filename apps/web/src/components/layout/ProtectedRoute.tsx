import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Dumbbell, LoaderCircle } from "lucide-react";
import { useAppSelector } from "../../store/hooks";
import { APP_NAME } from "@/utils/env";

export function ProtectedRoute() {
  const location = useLocation();
  const status = useAppSelector((state) => state.auth.status);

  if (status === "idle" || status === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background/80 backdrop-blur-sm px-6 text-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,hsl(var(--primary))_22%,transparent),transparent_34%),linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--primary))_48%,hsl(var(--card))_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-t from-backdrop to-transparent" />
        <div className="relative grid justify-items-center gap-5 text-center animate-fade-in">
          <div className="relative grid h-20 w-20 place-items-center rounded-full border border-primary/40 bg-card/85 shadow-sm">
            <LoaderCircle className="absolute h-20 w-20 animate-spin text-primary/45" strokeWidth={1.5} aria-hidden="true" />
            <Dumbbell className="h-8 w-8 text-foreground" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-foreground">{APP_NAME}</p>
            <p className="mt-2 text-sm font-bold text-muted-foreground">Preparing your workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    if (status === "password_change_required") {
      return <Navigate to="/member/first-password" replace state={{ from: location }} />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
