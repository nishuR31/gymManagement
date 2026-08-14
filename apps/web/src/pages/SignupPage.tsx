import { zodResolver } from "@hookform/resolvers/zod";
import { APP_NAME } from "../utils/env";
import { ArrowRight, Dumbbell, ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { registerThunk, loginThunk } from "../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const signupSchema = z.object({
  firstName: z.string().min(3, "First name is required"),
  lastName: z.string().min(3, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.auth.status);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  });

  if (status === "authenticated") {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const onSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      await dispatch(registerThunk({
        ...values,
        role: "MEMBER" // default role for public signups
      })).unwrap();

      toast.success("Account created successfully!");
      // Automatically login
      await dispatch(loginThunk({ email: values.email, password: values.password }));
      navigate("/member-login", { replace: true });
    } catch (err: any) {
      toast.error(err || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full text-foreground bg-background">
      <section className="grid w-full animate-fade-in md:grid-cols-2">
        <div className="relative hidden min-h-screen md:block bg-zinc-950">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1170&auto=format&fit=crop"
            alt="Intense workout"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-10 text-zinc-100">
            <Link className="flex items-center gap-3 text-xl font-black text-white" to="/">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg">
                <Dumbbell className="h-5 w-5" aria-hidden="true" />
              </span>
              {APP_NAME}
            </Link>
            <div className="animate-slide-up">
              <h1 className="mt-6 text-5xl font-black leading-[1.1] text-white">Join us<br />today.</h1>
              <p className="mt-4 text-lg text-zinc-300">Start your fitness journey with Valor.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-8 md:p-12 lg:p-16 bg-card border-l border-border">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
              <h1 className="text-3xl font-black text-foreground md:text-4xl">Sign up</h1>
              <p className="mt-2 text-sm text-muted-foreground">Create a new account.</p>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" type="text" error={errors.firstName?.message} {...register("firstName")} />
                <Input label="Last Name" type="text" error={errors.lastName?.message} {...register("lastName")} />
              </div>
              <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
              <Input label="Password" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />

              <Button type="submit" disabled={isSubmitting} className="w-full h-11 btn-primary mt-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4 ml-2" /></>}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between">
              <span className="w-1/5 border-b border-border lg:w-1/4"></span>
              <span className="text-xs text-center text-muted-foreground uppercase">or continue with</span>
              <span className="w-1/5 border-b border-border lg:w-1/4"></span>
            </div>

            <div className="mt-6">
              <a href={`http://localhost:4000/api/auth/google?redirect=${encodeURIComponent(window.location.origin + '/dashboard')}`} className="w-full h-11 btn-outline inline-flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm font-medium text-foreground">Already have an account?</p>
              <Link className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" to="/login">
                Sign in instead
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
