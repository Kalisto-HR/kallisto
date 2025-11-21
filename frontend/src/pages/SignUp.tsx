import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "../styles/auth.css";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // reset previous errors

    const payload = { email, first_name: firstName, last_name: lastName, password };

    try {
      const { ok, data } = await api("/v1.0/signup", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (!ok) {
        setError(data.msg || "Signup failed");
        setEmail("");
        setFirstName("");
        setLastName("");
        setPassword("");
        return;
      }

      console.log("Registered:", data);

      // redirect to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Signup failed:", err);
      setError("Signup failed due to network error");
      setEmail("");
      setFirstName("");
      setLastName("");
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
          <p className="subtitle">Create a new account</p>

          <form className="signin-form" onSubmit={handleSignUp}>
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
              <label>First Name</label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
              Sign Up
            </button>
          </form>

          <p className="signup-link">
            Already have an account? <a href="/signin" className="signup-text">Sign In</a>
          </p>
        </div>
      </div>

      {/* Tailwind keyframe animation */}
      <style>
        {`
        @keyframes slide-down {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.5s ease-out forwards;
        }
        `}
      </style>
    </Layout>
  );
}
