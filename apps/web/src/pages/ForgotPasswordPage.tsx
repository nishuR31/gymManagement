import { zodResolver } from "@hookform/resolvers/zod";
import { APP_NAME } from "../utils/env";
import { ArrowRight, Dumbbell, ArrowLeft, Loader2, Fingerprint, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { requestPasswordReset, verifyPasswordResetWith2FA, confirmPasswordReset } from "../features/auth/authApi";
// Note: Passkey generation options can be added here if frontend logic uses @simplewebauthn/browser

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
const codeSchema = z.object({ code: z.string().min(4, "Enter valid code") });
const passwordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "method" | "2fa" | "new_password">("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register: regEmail, handleSubmit: subEmail, formState: { errors: errEmail } } = useForm({ resolver: zodResolver(emailSchema) });
  const { register: regCode, handleSubmit: subCode, formState: { errors: errCode } } = useForm({ resolver: zodResolver(codeSchema) });
  const { register: regPass, handleSubmit: subPass, formState: { errors: errPass } } = useForm({ resolver: zodResolver(passwordSchema) });

  const onEmailSubmit = async (v: any) => {
    setIsSubmitting(true);
    try {
      setEmail(v.email);
      await requestPasswordReset(v.email);
      setStep("method");
      toast.success("Options retrieved. Choose how to verify your identity.");
    } catch (err: any) {
      toast.error(err || "Failed to request password reset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCodeSubmit = async (v: any) => {
    setIsSubmitting(true);
    try {
      const res = await verifyPasswordResetWith2FA(email, v.code);
      setResetToken(res.resetToken);
      setStep("new_password");
      toast.success("Verified! Enter your new password.");
    } catch (err: any) {
      toast.error(err || "Failed to verify 2FA code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPassSubmit = async (v: any) => {
    setIsSubmitting(true);
    try {
      // If we don't have a resetToken, it means they clicked email link.
      // But in this UI, we expect them to enter token manually or we get it from URL if we supported that.
      // For simplicity, we require the token obtained via 2FA or Passkey in this flow.
      if (!resetToken) {
        toast.error("Missing reset token");
        return;
      }
      await confirmPasswordReset(resetToken, v.password);
      toast.success("Password reset successfully! Please log in.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.error(err || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLink = () => {
    toast.success("Reset link sent to your email! (Please check inbox)");
    navigate("/login");
  };

  const handlePasskey = () => {
    // In a full implementation, call /auth/password-reset/passkey/generate here
    // and use @simplewebauthn/browser startAuthentication()
    toast.error("Passkey verification not fully implemented on web yet.");
  };

  const renderStep = () => {
    if (step === "email") {
      return (
        <form className="grid gap-4" onSubmit={subEmail(onEmailSubmit)}>
          <Input label="Email Address" type="email" error={errEmail.email?.message as string} {...regEmail("email")} />
          <Button type="submit" disabled={isSubmitting} className="w-full h-11 btn-primary">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4 ml-2" /></>}
          </Button>
        </form>
      );
    }

    if (step === "method") {
      return (
        <div className="grid gap-3">
          <Button variant="outline" onClick={handleEmailLink} className="w-full h-11 btn-outline">Send Reset Link to Email</Button>
          <Button variant="outline" onClick={() => setStep("2fa")} className="w-full h-11 btn-outline"><MessageSquare className="w-4 h-4 mr-2" /> Verify with Authenticator App</Button>
          <Button variant="outline" onClick={handlePasskey} className="w-full h-11 btn-outline"><Fingerprint className="w-4 h-4 mr-2" /> Verify with Passkey</Button>
        </div>
      );
    }

    if (step === "2fa") {
      return (
        <form className="grid gap-4" onSubmit={subCode(onCodeSubmit)}>
          <Input label="Authenticator Code" type="text" placeholder="000000" error={errCode.code?.message as string} {...regCode("code")} />
          <Button type="submit" disabled={isSubmitting} className="w-full h-11 btn-primary">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Code"}
          </Button>
        </form>
      );
    }

    if (step === "new_password") {
      return (
        <form className="grid gap-4" onSubmit={subPass(onPassSubmit)}>
          <Input label="New Password" type="password" error={errPass.password?.message as string} {...regPass("password")} />
          <Button type="submit" disabled={isSubmitting} className="w-full h-11 btn-primary">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
          </Button>
        </form>
      );
    }
  };

  return (
    <main className="flex min-h-screen w-full text-foreground bg-background">
      <section className="grid w-full animate-fade-in md:grid-cols-2">
        <div className="relative hidden min-h-screen md:block bg-zinc-950">
          <img
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1170&auto=format&fit=crop"
            alt="Gym weights"
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
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-8 md:p-12 lg:p-16 bg-card border-l border-border">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
              <h1 className="text-3xl font-black text-foreground md:text-4xl">Reset Password</h1>
              <p className="mt-2 text-sm text-muted-foreground">Follow the steps to regain access to your account.</p>
            </div>

            <div className="min-h-[200px]">
              {renderStep()}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
