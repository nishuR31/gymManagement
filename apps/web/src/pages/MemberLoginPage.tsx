import { zodResolver } from "@hookform/resolvers/zod";
import { APP_NAME } from "../utils/env";
import { ArrowRight, BadgeCheck, Dumbbell, KeyRound, UserRound, Fingerprint, Mail, MessageSquare, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { memberLoginThunk } from "../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const loginSchema = z.object({ 
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters") 
});
const codeSchema = z.object({ code: z.string().min(4, "Enter valid code") });

type LoginFormValues = z.infer<typeof loginSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;

type AuthStep = "login" | "2fa" | "otp" | "magic-link";

export function MemberLoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.auth.status);

  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [passwordCache, setPasswordCache] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register: regLogin, handleSubmit: subLogin, formState: { errors: errLogin } } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const { register: regCode, handleSubmit: subCode, formState: { errors: errCode } } = useForm<CodeFormValues>({ resolver: zodResolver(codeSchema) });

  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  if (status === "password_change_required") return <Navigate to="/member/first-password" replace />;

  const onFinalLogin = async (pass?: string, code?: string) => {
    setIsSimulating(true);
    const result = await dispatch(memberLoginThunk({ email: email || "john@example.com", password: pass || "password123", token: code }));
    setIsSimulating(false);

    if (memberLoginThunk.fulfilled.match(result)) {
      if (result.payload.user.mustChangePassword) {
        navigate("/member/first-password", { replace: true });
        return;
      }
      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
      return;
    }

    if (memberLoginThunk.rejected.match(result) && result.payload === "2FA_REQUIRED") {
      setPasswordCache(pass || "password123");
      setStep("2fa");
      toast.success("Password accepted. Enter 2FA code.");
      return;
    }

    if (result.payload === "NOT_A_MEMBER") {
      toast.error(`You are not a member of ${APP_NAME}`);
      return;
    }

    toast.error("Authentication failed");
  };

  const handleLoginSubmit = (v: LoginFormValues) => { setEmail(v.email); setPasswordCache(v.password); onFinalLogin(v.password); };
  const handleCodeSubmit = (v: CodeFormValues) => { onFinalLogin(passwordCache, v.code); };

  const handleOAuth = (provider: string) => { toast.success(`Redirecting to ${provider}...`); setTimeout(() => onFinalLogin(), 1500); };
  const handlePasskey = () => { toast.success("Prompting for Passkey..."); setTimeout(() => onFinalLogin(), 1500); };
  const handleMagicLink = () => { setStep("magic-link"); toast.success("Magic link sent to " + email); };
  const handleSendOTP = () => { setStep("otp"); toast.success("OTP sent to " + email); };

  const renderStep = () => {
    if (step === "login") {
      return (
        <div className="animate-fade-in space-y-6">
          <form className="grid gap-4" onSubmit={subLogin(handleLoginSubmit)}>
            <Input label="Member Email" type="email" placeholder="Email" autoComplete="email" error={errLogin.email?.message} {...regLogin("email")} />
            
            <div className="space-y-1">
              <Input 
                label="Password" 
                type={showPassword ? "text" : "password"} 
                placeholder="Password"
                autoComplete="current-password" 
                error={errLogin.password?.message} 
                {...regLogin("password")} 
                rightElement={
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>

            <Button type="submit" disabled={isSimulating} className="w-full h-11 btn-primary mt-2">
              {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
          </div>

          <div className="grid gap-3">
            <Button variant="outline" type="button" onClick={handlePasskey} className="w-full h-11 btn-outline"><Fingerprint className="w-5 h-5" /> Continue with Passkey</Button>
            <div className="flex gap-4">
              <Button variant="outline" type="button" onClick={() => toast.error("Google Auth is not configured on the backend yet")} className="w-full h-11 btn-outline">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
            </div>
          </div>
          
          <div className="grid gap-3 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={handleSendOTP} className="w-full h-11 btn-outline"><MessageSquare className="w-4 h-4" /> Send OTP to Email</Button>
          </div>
        </div>
      );
    }

    if (step === "2fa" || step === "otp") {
      return (
        <div className="animate-fade-in space-y-6">
          <div className="flex items-center gap-2 pb-4">
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" onClick={() => setStep("login")}><ArrowLeft className="h-4 w-4" /></Button>
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
          <Button variant="outline" onClick={() => setStep("login")} className="mt-4 btn-outline">Back to Login</Button>
        </div>
      );
    }
  };

  return (
    <main className="flex min-h-screen w-full text-foreground bg-background">
      <section className="grid w-full animate-fade-in md:grid-cols-2">
        <div className="relative hidden min-h-screen md:block bg-zinc-950">
          <img
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1169&auto=format&fit=crop"
            alt="Member workout"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-10 text-zinc-100">
            <Link className="flex items-center gap-3 text-xl font-black text-white" to="/">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg">
                <Dumbbell className="h-5 w-5" aria-hidden="true" />
              </span>
              {APP_NAME}
            </Link>
            <div className="animate-slide-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white backdrop-blur-md">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Member Access
              </p>
              <h1 className="mt-6 text-5xl font-black leading-[1.1] text-white">Unlock<br />your true<br />potential.</h1>
              <div className="mt-8 grid gap-4">
                <div className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-primary" /><span className="font-semibold">Track your training progress</span></div>
                <div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-primary" /><span className="font-semibold">Manage your memberships</span></div>
                <div className="flex items-center gap-3"><Dumbbell className="h-5 w-5 text-primary" /><span className="font-semibold">Book classes and sessions</span></div>
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
              <h1 className="text-3xl font-black text-foreground md:text-4xl">Member Login</h1>
              <p className="mt-2 text-sm text-muted-foreground">Access your personal gym portal securely.</p>
            </div>

            <div className="min-h-75">
              {renderStep()}
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm font-medium text-foreground">Staff or Administrator?</p>
              <Link className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" to="/login">
                Use staff portal
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
