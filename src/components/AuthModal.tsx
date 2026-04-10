import { useState, type FormEvent } from "react";
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
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
    setMode("login");
    resetMessages();
    onClose();
  }

  function toggleMode() {
    setMode((m) => (m === "login" ? "signup" : "login"));
    resetMessages();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    resetMessages();
    if (mode === "login") {
      const ok = login(email, password);
      if (ok) {
        setSuccess("Login successful.");
        setTimeout(() => {
          handleClose();
        }, 600);
      } else {
        setError("Invalid email or password.");
      }
      return;
    }
    const result = signup(email, password, confirm);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Account created. You can sign in now.");
    setMode("login");
    setPassword("");
    setConfirm("");
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
        <h2 id="auth-heading">{mode === "login" ? "Login" : "Sign up"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {mode === "signup" ? (
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
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
            {mode === "login" ? "Login" : "Sign up"}
          </button>
        </form>
        <p className="form-footer">
          {mode === "login" ? "No account yet? " : "Already registered? "}
          <button type="button" className="link-btn" onClick={toggleMode}>
            {mode === "login" ? "Sign up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
