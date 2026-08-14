import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "../store/hooks";
import { bootstrapAuthThunk } from "../features/auth/authSlice";
import { setAccessToken } from "../services/api";
import { toast } from "sonner";

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = searchParams.get("token");
    const redirectUrl = searchParams.get("redirect") || "/dashboard";

    if (token) {
      setAccessToken(token);
      // We have the access token and the http-only refresh cookie is already set by backend.
      // Calling bootstrapAuthThunk will refresh and fetch the user session properly.
      dispatch(bootstrapAuthThunk())
        .unwrap()
        .then((result) => {
          if (result.user.role === "MEMBER") {
            toast.success("Signed in successfully!");
            navigate("/my-membership", { replace: true });
          } else {
            toast.success("Signed in securely");
            navigate(new URL(redirectUrl).pathname, { replace: true });
          }
        })
        .catch((err) => {
          toast.error("Failed to fetch user session");
          navigate("/login", { replace: true });
        });
    } else {
      toast.error("Authentication failed. No token received.");
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
