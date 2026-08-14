import { startRegistration } from "@simplewebauthn/browser";
import { ShieldAlert, ShieldCheck, Key, UserRound, Smartphone, Moon, Sun, MoonStar } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import * as profileApi from "../features/auth/profileApi";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatDateTime } from "../utils/format";
import { setCredentials } from "../features/auth/authSlice";
import { useTheme } from "../hooks/useTheme";
import type { PasskeyDto } from "@gym/shared";

export function ProfileSettingsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { theme, setTheme, styleMode, setStyleMode } = useTheme();
  
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  // Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // 2FA states
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  
  // Passkey states
  const [passkeys, setPasskeys] = useState<PasskeyDto[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      void loadPasskeys();
    }
  }, [user]);

  const loadPasskeys = async () => {
    try {
      const keys = await profileApi.listPasskeys();
      setPasskeys(keys);
    } catch (error) {
      console.error("Failed to load passkeys:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = await profileApi.updateProfile({ firstName, lastName, email });
      dispatch(setCredentials({ user: updatedUser }));
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update profile"));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      await profileApi.changePassword({ currentPassword: currentPassword || undefined, newPassword });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change password"));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const response = await profileApi.generateTwoFactor();
      setQrCodeUrl(response.qrCodeDataUrl);
      setTwoFactorSecret(response.secret);
      setIs2FAModalOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not generate 2FA setup"));
    }
  };

  const handleVerify2FA = async () => {
    try {
      await profileApi.verifyTwoFactor(twoFactorToken);
      setIs2FAModalOpen(false);
      setTwoFactorToken("");
      if (user) {
        dispatch(setCredentials({ user: { ...user, twoFactorEnabled: true } }));
      }
      toast.success("Two-Factor Authentication enabled");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Invalid 2FA code"));
    }
  };

  const handleDisable2FA = async () => {
    const token = window.prompt("Enter your current 2FA code to disable it:");
    if (!token) return;
    try {
      await profileApi.disableTwoFactor(token);
      if (user) {
        dispatch(setCredentials({ user: { ...user, twoFactorEnabled: false } }));
      }
      toast.success("Two-Factor Authentication disabled");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not disable 2FA. Invalid code."));
    }
  };

  const handleAddPasskey = async () => {
    setPasskeysLoading(true);
    try {
      const options = await profileApi.generatePasskeyRegistration();
      const registrationResponse = await startRegistration({ optionsJSON: options });
      await profileApi.verifyPasskeyRegistration(registrationResponse);
      toast.success("Passkey registered successfully");
      void loadPasskeys();
      if (user) {
        dispatch(setCredentials({ user: { ...user, hasPasskeys: true } }));
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not register passkey"));
    } finally {
      setPasskeysLoading(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this passkey?")) return;
    try {
      await profileApi.deletePasskey(id);
      setPasskeys(passkeys.filter(p => p.id !== id));
      if (passkeys.length === 1 && user) {
        dispatch(setCredentials({ user: { ...user, hasPasskeys: false } }));
      }
      toast.success("Passkey removed");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not remove passkey"));
    }
  };

  if (!user) return null;

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="card-base p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">My Account</p>
        <h2 className="mt-2 text-3xl font-black text-foreground">Profile Settings</h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Manage your personal information and security preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="grid gap-6">
          <Card title="Personal Information">
            <form onSubmit={handleUpdateProfile} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={loading} className="h-9 px-4">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Change Password">
            <form onSubmit={handleChangePassword} className="grid gap-4">
              <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={passwordLoading} className="h-9 px-4">
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </Card>

          <Card title="App Appearance">
            <div className="grid gap-6">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  {theme === "amoled" ? <MoonStar className="h-4 w-4" /> : theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Color Scheme
                </h3>
                <div className="flex items-center gap-3">
                  <Button variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")} className="w-24">
                    Light
                  </Button>
                  <Button variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")} className="w-24">
                    Dark
                  </Button>
                  <Button variant={theme === "amoled" ? "primary" : "secondary"} onClick={() => setTheme("amoled")}>
                    AMOLED (Beta)
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-foreground">Styling Paradigm</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant={styleMode === "minimal" ? "primary" : "secondary"} onClick={() => setStyleMode("minimal")}>
                    Minimalist
                  </Button>
                  <Button variant={styleMode === "glass" ? "primary" : "secondary"} onClick={() => setStyleMode("glass")}>
                    Glassmorphism
                  </Button>
                  <Button variant={styleMode === "clay" ? "primary" : "secondary"} onClick={() => setStyleMode("clay")}>
                    Claymorphism
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card title="Two-Factor Authentication (2FA)">
            <div className="flex flex-col items-center justify-center py-4 text-center">
              {user.twoFactorEnabled ? (
                <>
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/20 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">2FA is Enabled</h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">Your account is secured with an authenticator app.</p>
                  <Button variant="outline" className="mt-5 w-full" onClick={handleDisable2FA}>
                    Disable 2FA
                  </Button>
                </>
              ) : (
                <>
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">2FA is Not Enabled</h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">Add an extra layer of security to your account.</p>
                  <Button className="mt-5 w-full" onClick={handleSetup2FA}>
                    Set up 2FA
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card title="Passkeys (WebAuthn)">
            <p className="text-sm font-medium text-muted-foreground mb-4">
              Use FaceID, TouchID, or a security key to sign in securely without a password.
            </p>
            
            <div className="grid gap-3">
              {passkeys.map((pk, idx) => (
                <div key={pk.id} className="flex items-center justify-between rounded-md border border-border bg-background p-3">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Passkey {idx + 1}</p>
                      <p className="text-xs font-semibold text-muted-foreground">Added {formatDateTime(pk.createdAt)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeletePasskey(pk.id)} className="text-xs font-bold text-destructive hover:underline">
                    Remove
                  </button>
                </div>
              ))}
              
              <Button variant="outline" className="mt-2 w-full flex items-center justify-center gap-2" onClick={handleAddPasskey} disabled={passkeysLoading}>
                <Smartphone className="h-4 w-4" />
                {passkeysLoading ? "Registering..." : "Add Passkey"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} title="Set up Two-Factor Authentication">
        <div className="grid gap-4 py-2">
          <p className="text-sm font-medium text-foreground">
            1. Scan this QR code using an authenticator app (like Google Authenticator, Authy, etc) or enter the manual code.
          </p>
          <div className="flex flex-col md:flex-row items-center gap-6 justify-center rounded-md border border-border bg-card p-4">
            <div className="flex justify-center bg-white p-2 rounded-md">
              {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="h-40 w-40" />}
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <p className="text-xs font-semibold text-muted-foreground uppercase text-center">Manual Setup Code</p>
              <div className="bg-muted p-2 rounded text-center">
                <code className="text-sm font-mono font-bold text-foreground break-all">{twoFactorSecret}</code>
              </div>
            </div>
          </div>
          <p className="text-sm font-medium text-foreground">
            2. Enter the 6-digit code generated by the app to verify.
          </p>
          <div className="flex gap-3">
            <Input 
              value={twoFactorToken} 
              onChange={(e) => setTwoFactorToken(e.target.value)} 
              placeholder="000000" 
              maxLength={6}
              className="numeric font-black tracking-widest text-lg"
            />
            <Button onClick={handleVerify2FA} disabled={twoFactorToken.length !== 6}>
              Verify
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
