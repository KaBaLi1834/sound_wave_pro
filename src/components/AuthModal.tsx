import { useState, type FormEvent } from "react";
import { googleAuthUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
  initialError?: string | null;
  onClearInitialError: () => void;
};

export function AuthModal({
  open,
  onClose,
  initialError,
  onClearInitialError,
}: Props) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) return null;

  const displayError = error ?? initialError;

  function resetMessages() {
    setError(null);
    setSuccess(null);
    onClearInitialError();
  }

  function handleClose() {
    setEmail("");
    setPassword("");
    setConfirm("");
    setName("");
    setMode("login");
    resetMessages();
    onClose();
  }

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    if (mode === "login") {
      const r = await login(email, password);
      if (r.ok) handleClose();
      else setError(r.error || "Login failed");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const r = await register(email, password, name || email.split("@")[0]);
    if (r.ok) handleClose();
    else setError(r.error || "Sign up failed");
  }

  function startGoogle() {
    window.location.href = googleAuthUrl();
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) handleClose();
      }}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-heading"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="auth-heading">Account</h2>

        <button type="button" className="btn btn-ghost google-btn" onClick={startGoogle}>
          Continue with Google
        </button>
        <p className="form-hint">
          Google sign-in uses your API server. Ensure Google redirect URI matches
          your Railway API URL.
        </p>

        <form onSubmit={onSubmitEmail}>
          <div className="form-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                onClearInitialError();
              }}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {mode === "signup" ? (
            <>
              <div className="form-field">
                <label htmlFor="auth-name">Display name</label>
                <input
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="auth-confirm">Confirm password</label>
                <input
                  id="auth-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
            </>
          ) : null}
          {displayError ? (
            <p className="form-msg error" role="alert">
              {displayError}
            </p>
          ) : null}
          {success ? (
            <p className="form-msg success" role="status">
              {success}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary full-width">
            {mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <p className="form-footer">
          {mode === "login" ? "No account? " : "Have an account? "}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              resetMessages();
            }}
          >
            {mode === "login" ? "Sign up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
