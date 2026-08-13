import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BadgeCheck, Dumbbell, KeyRound, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { completeFirstPasswordThunk } from "../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(8, "Confirm your password")
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function FirstPasswordPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.auth.status);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" }
  });

  if (status === "unauthenticated" || status === "idle") {
    return <Navigate to="/member-login" replace />;
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: PasswordFormValues): Promise<void> => {
    const result = await dispatch(completeFirstPasswordThunk(values.password));
    if (completeFirstPasswordThunk.fulfilled.match(result)) {
      toast.success("Password set");
      navigate("/dashboard", { replace: true });
      return;
    }
    toast.error("Could not set password");
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 text-foreground bg-background">
      <section className="w-full max-w-lg animate-slide-up rounded-lg border border-border bg-panel/95 p-6 shadow-sm md:p-8">
        <div className="mb-8">
          <Link className="flex items-center gap-3 text-sm font-black text-primary" to="/">
            <Dumbbell className="h-4 w-4" aria-hidden="true" />
            ValorFitness
          </Link>
          <p className="mt-6 inline-flex items-center gap-2 rounded-md border border-brand/30 bg-background px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            First Login
          </p>
          <h1 className="mt-4 text-3xl font-black text-foreground md:text-4xl">Set your password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Create a private password before opening your workspace.</p>
        </div>

        <form className="grid gap-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <Input label="New password" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Button type="submit" disabled={isSubmitting || status === "loading"} className="mt-2 w-full">
            {status === "loading" ? "Saving" : "Set Password"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
        <div className="mt-6 grid gap-2 rounded-lg border border-border bg-surface/70 p-4 text-sm font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Your temporary password is replaced immediately.</span>
          <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Future logins use this private password.</span>
        </div>
      </section>
    </main>
  );
}
