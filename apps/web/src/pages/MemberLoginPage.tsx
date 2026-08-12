import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BadgeCheck, Dumbbell, KeyRound, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { memberLoginThunk } from "../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const memberLoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type MemberLoginFormValues = z.infer<typeof memberLoginSchema>;

export function MemberLoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.auth.status);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<MemberLoginFormValues>({
    resolver: zodResolver(memberLoginSchema),
    defaultValues: { email: "", password: "" }
  });

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  if (status === "password_change_required") {
    return <Navigate to="/member/first-password" replace />;
  }

  const onSubmit = async (values: MemberLoginFormValues): Promise<void> => {
    const result = await dispatch(memberLoginThunk(values));

    if (memberLoginThunk.fulfilled.match(result)) {
      if (result.payload.user.mustChangePassword) {
        navigate("/member/first-password", { replace: true });
        return;
      }
      navigate("/dashboard", { replace: true });
      return;
    }

    if (result.payload === "NOT_A_MEMBER") {
      toast.error("You are not a member of ValorFitness");
      return;
    }

    toast.error("Invalid email or password");
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 text-ink app-gradient">
      <section className="grid w-full max-w-5xl animate-fade-in overflow-hidden rounded-lg border border-line bg-panel/95 shadow-soft lg:grid-cols-[minmax(0,0.86fr)_minmax(380px,1fr)]">
        <div className="hidden border-r border-line bg-backdrop p-8 lg:grid">
          <div className="flex h-full flex-col justify-between">
            <Link className="flex items-center gap-3 text-lg font-black text-ink" to="/">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-panel">
                <Dumbbell className="h-5 w-5" aria-hidden="true" />
              </span>
              ValorFitness
            </Link>
            <div>
              <p className="inline-flex items-center gap-2 rounded-md border border-brand/40 bg-panel/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-brand-light">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Member Access
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight">Your gym account starts at the front desk.</h1>
              <div className="mt-6 grid gap-3 text-sm font-bold text-ink-muted">
                <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-brand" aria-hidden="true" /> Use your registered member email</span>
                <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-brand" aria-hidden="true" /> First login uses a temporary password</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
        <div className="mb-8">
          <Link className="text-sm font-black text-brand" to="/">ValorFitness</Link>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-brand">Member Access</p>
          <h1 className="mt-3 text-3xl font-black text-ink md:text-4xl">Member login</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Use the temporary password from the front desk.</p>
        </div>

        <form className="grid gap-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
          <Button type="submit" disabled={isSubmitting || status === "loading"} className="mt-2 w-full">
            {status === "loading" ? "Signing in" : "Sign in"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
        <Link className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand" to="/login">
          Admin / Staff login
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        </div>
      </section>
    </main>
  );
}
