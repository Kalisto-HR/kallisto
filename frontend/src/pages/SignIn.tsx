/**
 * SignIn.tsx
 * User login page with client-side validation.
 */
import Layout from "../components/Layout";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { validateEmail, validateRequired } from "../utils/validation";
import "../styles/auth.css";

interface FieldErrors {
  email: string | null;
  password: string | null;
}

export default function SignInPage() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Compute field errors
  const fieldErrors: FieldErrors = useMemo(() => ({
    email: validateEmail(email),
    password: validateRequired(password, "Password"),
  }), [email, password]);

  // Check if form has any validation errors
  const hasErrors = useMemo(() => {
    return Object.values(fieldErrors).some((err) => err !== null);
  }, [fieldErrors]);

  // Mark field as touched on blur
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // clear previous errors

    // Mark all fields as touched to show errors
    setTouched({ email: true, password: true });

    // Don't submit if validation errors exist
    if (hasErrors) {
      return;
    }

    const payload = { email, password };

    try {
      const { ok, data } = await api<{ msg?: string }>("/v1.0/signin", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (!ok) {
        setError(data.msg || "Sign in failed");
        setEmail("");
        setPassword("");
        setTouched({});
        return;
      }

      console.log("Signed in:", data);

      // Refresh auth state and redirect to dashboard
      await checkAuth();
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login failed:", err);
      setError("Login failed due to network error");
      setEmail("");
      setPassword("");
      setTouched({});
    }
  };

  return (
    <Layout>

    {/* Error Toast */}{error && (
      <div
        className="fixed top-[5%] left-[50%] transform -translate-x-1/2 z-50"
        style={{ width: "90%", maxWidth: "400px" }}
      >
        <div className="bg-red-500 bg-opacity-90 text-white px-4 py-3 rounded-lg shadow-lg text-center break-words opacity-75 transition-opacity duration-300">
          {error.length > 120 ? `${error.slice(0, 120)}...` : error}
        </div>
      </div>
    )}

      <div className="signin-container">
        <div className="signin-card">
          <h1 className="app-title">Kallisto</h1>
          <p className="subtitle">Sign in to your account</p>

          <form className="signin-form" onSubmit={handleSignIn}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email")}
                className={touched.email && fieldErrors.email ? "input-error" : ""}
              />
              {touched.email && fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="........"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                className={touched.password && fieldErrors.password ? "input-error" : ""}
              />
              {touched.password && fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </div>

            <button type="submit" className="signin-button" disabled={hasErrors}>
              Sign In
            </button>
          </form>

          <p className="signup-link">
            Don't have an account? <a href="/signup" className="signup-text">Sign Up</a>
          </p>
        </div>
      </div>

      {/* Inline styles for validation */}
      <style>
        {`
        .field-error {
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          display: block;
        }
        .input-error {
          border-color: #ef4444 !important;
        }
        .signin-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        `}
      </style>
    </Layout>
  );
}
