import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BarChart3, Dumbbell, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { loginThunk, logoutThunk } from "../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAppSelector((state) => state.auth.status);
  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  if (status === "authenticated") {
    return <Navigate to={destination} replace />;
  }

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    const result = await dispatch(loginThunk(values));

    if (loginThunk.fulfilled.match(result)) {
      if (result.payload.user.role === "MEMBER") {
        await dispatch(logoutThunk());
        toast.error("Use member login for member access");
        navigate("/member-login", { replace: true });
        return;
      }
      toast.success("Signed in");
      navigate(destination, { replace: true });
      return;
    }

    toast.error("Invalid email or password");
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 text-ink app-gradient">
      <section className="grid w-full max-w-6xl animate-fade-in overflow-hidden rounded-lg border border-line bg-panel/95 shadow-soft lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.92fr)]">
        <div className="relative hidden min-h-[560px] overflow-hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=85"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(148deg, var(--color-backdrop) 0%, color-mix(in srgb, var(--color-backdrop) 76%, transparent) 48%, color-mix(in srgb, var(--color-brand-dark) 52%, transparent) 100%), linear-gradient(0deg, color-mix(in srgb, var(--color-backdrop) 82%, transparent) 0%, transparent 48%)"
            }}
          />
          <div className="relative flex h-full flex-col justify-between p-8 text-ink">
            <Link className="flex items-center gap-3 text-lg font-black" to="/">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-panel">
                <Dumbbell className="h-5 w-5" aria-hidden="true" />
              </span>
              ValorFitness
            </Link>
            <div className="animate-slide-up">
              <p className="inline-flex items-center gap-2 rounded-md border border-brand/40 bg-backdrop/70 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-brand-light">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Operations
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight">Front desk, coaching, and billing in rhythm.</h1>
              <div className="mt-6 grid gap-3">
                <LoginProof icon={Users} text="Member lifecycle controls" />
                <LoginProof icon={BarChart3} text="Reports and revenue snapshots" />
                <LoginProof icon={LockKeyhole} text="Role-based admin access" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="mb-8">
            <Link className="text-sm font-black text-brand lg:hidden" to="/">ValorFitness</Link>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-brand lg:mt-0">Gym Management</p>
            <h1 className="mt-3 text-3xl font-black text-ink md:text-4xl">Sign in</h1>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Access the ValorFitness workspace for staff operations.</p>
          </div>

          <form className="grid gap-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" disabled={isSubmitting || status === "loading"} className="mt-2 w-full">
              {status === "loading" ? "Signing in" : "Sign in"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
          <div className="mt-6 rounded-lg border border-line bg-surface/70 p-4">
            <p className="text-sm font-bold text-ink">Member account?</p>
            <Link className="mt-2 inline-flex items-center gap-2 text-sm font-black text-brand" to="/member-login">
              Use member login
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginProof({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-panel/10 px-3 py-2">
      <Icon className="h-4 w-4 text-brand-light" aria-hidden="true" />
      <span className="text-sm font-bold text-ink">{text}</span>
    </div>
  );
}
