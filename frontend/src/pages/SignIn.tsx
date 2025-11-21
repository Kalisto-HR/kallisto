import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "../styles/auth.css";

export default function SignInPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");


  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // clear previous errors

    const payload = { email, password };

    try {      
      const { ok, data } = await api("/v1.0/signin", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (!ok) {
        setError(data.msg);
        setEmail("");
        setPassword("");
        return;
      }


      console.log("Signed in:", data);

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login failed:", err);
      setError("Login failed due to network error");
      setEmail("");
      setPassword("");
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
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="........"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="signin-button">
              Sign In
            </button>
          </form>

          <p className="signup-link">
            Don't have an account? <a href="/signup" className="signup-text">Sign Up</a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
