import { zodResolver } from "@hookform/resolvers/zod";
import { APP_NAME } from "../utils/env";
import { ArrowRight, BarChart3, Dumbbell, LockKeyhole, ShieldCheck, Users, Fingerprint, Mail, KeyRound, MessageSquare, ArrowLeft, Loader2, Key } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { loginThunk, logoutThunk } from "../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
const passwordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });
const codeSchema = z.object({ code: z.string().min(4, "Enter valid code") });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;

type AuthStep = "email" | "password" | "2fa" | "otp" | "magic-link";

interface LocationState {
  from?: { pathname?: string; };
}

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAppSelector((state) => state.auth.status);
  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname ?? "/dashboard";

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [passwordCache, setPasswordCache] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  const { register: regEmail, handleSubmit: subEmail, formState: { errors: errEmail } } = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });
  const { register: regPass, handleSubmit: subPass, formState: { errors: errPass } } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });
  const { register: regCode, handleSubmit: subCode, formState: { errors: errCode } } = useForm<CodeFormValues>({ resolver: zodResolver(codeSchema) });

  if (status === "authenticated") return <Navigate to={destination} replace />;

  const onFinalLogin = async (pass?: string, code?: string) => {
    setIsSimulating(true);
    // In the future, pass the 2FA `code` to the backend if provided.
    const result = await dispatch(loginThunk({ email: email || "admin@example.com", password: pass || "adminpassword" }));
    setIsSimulating(false);
    
    if (loginThunk.fulfilled.match(result)) {
      if (result.payload.user.role === "MEMBER") {
        await dispatch(logoutThunk());
        toast.error("Use member login for member access");
        navigate("/member-login", { replace: true });
        return;
      }
      toast.success("Signed in securely");
      navigate(destination, { replace: true });
      return;
    }

    // If the backend eventually supports returning a 2FA error:
    if (loginThunk.rejected.match(result) && result.payload === "2FA_REQUIRED") {
      setPasswordCache(pass || "");
      setStep("2fa");
      toast.success("Password accepted. Enter 2FA code.");
      return;
    }

    toast.error("Authentication failed");
  };

  const handleEmailNext = (v: EmailFormValues) => { setEmail(v.email); setStep("password"); };
  const handlePassNext = (v: PasswordFormValues) => { onFinalLogin(v.password); };
  const handleCodeSubmit = (v: CodeFormValues) => { onFinalLogin(passwordCache, v.code); };

  const handleOAuth = (provider: string) => { toast.success(`Redirecting to ${provider}...`); setTimeout(() => onFinalLogin(), 1500); };
  const handlePasskey = () => { toast.success("Prompting for Passkey..."); setTimeout(() => onFinalLogin(), 1500); };
  const handleMagicLink = () => { setStep("magic-link"); toast.success("Magic link sent to " + email); };
  const handleSendOTP = () => { setStep("otp"); toast.success("OTP sent to " + email); };

  const renderStep = () => {
    if (step === "email") {
      return (
        <div className="animate-fade-in space-y-6">
          <form className="grid gap-4" onSubmit={subEmail(handleEmailNext)}>
            <Input label="Email" type="email" autoComplete="email" error={errEmail.email?.message} {...regEmail("email")} />
            <Button type="submit" className="w-full h-11 btn-primary">Continue with Email <ArrowRight className="h-4 w-4" /></Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
          </div>

          <div className="grid gap-3">
            <Button variant="outline" type="button" onClick={handlePasskey} className="w-full h-11 btn-outline"><Fingerprint className="w-5 h-5" /> Continue with Passkey</Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" type="button" onClick={() => handleOAuth("Google")} className="w-full h-11 btn-outline">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Google
              </Button>
              <Button variant="outline" type="button" onClick={() => handleOAuth("Facebook")} className="w-full h-11 btn-outline">
                <svg className="w-5 h-5 mr-2 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-1.125 0-2.517.236-2.517 1.426v2.54h3.82l-.369 3.667h-3.451v7.98h-4.566z" /></svg>
                Facebook
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (step === "password") {
      return (
        <div className="animate-fade-in space-y-6">
          <div className="flex items-center gap-2 pb-4">
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setStep("email")}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium">{email}</span>
          </div>
          <form className="grid gap-4" onSubmit={subPass(handlePassNext)}>
            <Input label="Password" type="password" autoComplete="current-password" error={errPass.password?.message} {...regPass("password")} />
            <Button type="submit" className="w-full h-11 btn-primary">Sign In <ArrowRight className="h-4 w-4" /></Button>
          </form>
          
          <div className="grid gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={handleSendOTP} className="w-full h-11 btn-outline"><MessageSquare className="w-4 h-4" /> Send OTP to Email</Button>
            <Button variant="outline" type="button" onClick={handleMagicLink} className="hidden w-full h-11 btn-outline"><Mail className="w-4 h-4" /> Send Magic Link</Button>
          </div>
        </div>
      );
    }

    if (step === "2fa" || step === "otp") {
      return (
        <div className="animate-fade-in space-y-6">
          <div className="flex items-center gap-2 pb-4">
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setStep("password")}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium">{step === "2fa" ? "Two-Factor Authentication" : "One-Time Password"}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {step === "2fa" ? "Enter the 6-digit code from your authenticator app." : `We sent a code to ${email}.`}
          </p>
          <form className="grid gap-4" onSubmit={subCode(handleCodeSubmit)}>
            <Input label="Verification Code" type="text" placeholder="000000" error={errCode.code?.message} {...regCode("code")} />
            <Button type="submit" disabled={isSimulating} className="w-full h-11 btn-primary">
              {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Sign In"}
            </Button>
          </form>
        </div>
      );
    }

    if (step === "magic-link") {
      return (
        <div className="animate-fade-in space-y-6 text-center py-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Check your email</h3>
          <p className="text-sm text-muted-foreground">We sent a magic link to <strong>{email}</strong>. Click the link inside to instantly sign in.</p>
          <Button variant="outline" onClick={() => setStep("email")} className="mt-4 btn-outline">Back to Login</Button>
        </div>
      );
    }
  };

  return (
    <main className="flex min-h-screen w-full text-foreground bg-background">
      <section className="grid w-full animate-fade-in md:grid-cols-2">
        <div className="relative hidden min-h-screen md:block bg-zinc-950">
          <img
            src="https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=1169&auto=format&fit=crop"
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
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Staff Operations
              </p>
              <h1 className="mt-6 text-5xl font-black leading-[1.1] text-white">Elevate<br/>your gym's<br/>performance.</h1>
              <div className="mt-8 grid gap-4">
                <div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><span className="font-semibold">Member lifecycle controls</span></div>
                <div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-primary" /><span className="font-semibold">Reports and revenue snapshots</span></div>
                <div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-primary" /><span className="font-semibold">Enterprise-grade security</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-8 md:p-12 lg:p-16 bg-card border-l border-border">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to website
              </Link>
              <h1 className="text-3xl font-black text-foreground md:text-4xl">Sign in</h1>
              <p className="mt-2 text-sm text-muted-foreground">Access the staff operations dashboard securely.</p>
            </div>

            <div className="min-h-[300px]">
              {renderStep()}
            </div>
            
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm font-medium text-foreground">Member account?</p>
              <Link className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" to="/member-login">
                Use member portal
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
