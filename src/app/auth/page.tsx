"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type Mode = "login" | "register";

function AuthContent() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(errorParam === "auth_failed" ? t("auth.errorGeneric") : "");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setError(error);
        } else {
          router.push("/dashboard");
        }
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setError(error);
        } else {
          setSuccessMessage(t("auth.checkEmail"));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
          Vibe<span style={{ color: "var(--accent-light)" }} className="logo-accent">Coding</span>
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("auth.subtitle")}
        </p>
      </div>

      <div
        className="w-full max-w-sm"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
        }}
      >
        <div
          className="mb-6 flex"
          style={{
            background: "var(--bg-elevated)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
          }}
        >
          <button
            onClick={() => setMode("login")}
            className="flex-1 py-2 text-sm font-medium transition-all duration-200"
            style={{
              borderRadius: "var(--radius-sm)",
              background: mode === "login" ? "var(--accent)" : "transparent",
              color: mode === "login" ? "#fff" : "var(--text-muted)",
            }}
          >
            {t("auth.login")}
          </button>
          <button
            onClick={() => setMode("register")}
            className="flex-1 py-2 text-sm font-medium transition-all duration-200"
            style={{
              borderRadius: "var(--radius-sm)",
              background: mode === "register" ? "var(--accent)" : "transparent",
              color: mode === "register" ? "#fff" : "var(--text-muted)",
            }}
          >
            {t("auth.register")}
          </button>
        </div>

        <button
          onClick={signInWithGoogle}
          // This triggers signInWithOAuth which now explicitly sets redirectTo to /auth/callback
          className="mb-4 flex w-full items-center justify-center gap-3 py-3 text-sm font-medium transition-all duration-200"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--border)")
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("auth.google")}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("auth.or")}
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 text-sm outline-none transition-all duration-200"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />
          <input
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 text-sm outline-none transition-all duration-200"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />

          {error && (
            <p className="text-xs" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}

          {successMessage && (
            <p className="text-xs" style={{ color: "var(--success)" }}>
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-3 text-sm font-semibold transition-all duration-200"
            style={{
              background: loading ? "var(--text-muted)" : "var(--accent)",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              boxShadow: loading ? "none" : "var(--shadow-glow)",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "..."
              : mode === "login"
              ? t("auth.loginButton")
              : t("auth.registerButton")}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
        {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="underline"
          style={{ color: "var(--accent-light)" }}
        >
          {mode === "login" ? t("auth.register") : t("auth.login")}
        </button>
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}
