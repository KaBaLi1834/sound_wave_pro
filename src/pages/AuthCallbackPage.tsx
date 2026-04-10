import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, setStoredToken } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");
    if (error) {
      navigate("/", { replace: true });
      return;
    }
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    setStoredToken(token);
    void (async () => {
      const res = await apiFetch("/api/me");
      if (!res.ok) {
        navigate("/", { replace: true });
        return;
      }
      const data = (await res.json()) as {
        user: { id: string; email: string; name: string };
      };
      setSession(data.user, token);
      navigate("/", { replace: true });
    })();
  }, [params, navigate, setSession]);

  return (
    <div className="page-wrap page-callback">
      <p>Signing you in…</p>
    </div>
  );
}
