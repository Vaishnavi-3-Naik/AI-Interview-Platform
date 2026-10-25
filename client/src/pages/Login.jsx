
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./login.css";
function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email: email.trim().toLowerCase(),
          password,
        }
      );

      if (!response.data.success || !response.data.token) {
        setMessage(response.data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", response.data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      navigate("/dashboard");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        (error.request
          ? "Cannot connect to the server. Check that the backend is running."
          : "Something went wrong. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>AI Interview Platform</h1>
        <p style={styles.subtitle}>Practice. Improve. Succeed.</p>
        <h2 style={styles.heading}>Login</h2>

        <form onSubmit={handleLogin}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={styles.input}
            required
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={styles.input}
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && (
          <p role="alert" style={styles.message}>
            {message}
          </p>
        )}

        <p style={styles.footer}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f6f8",
    padding: 20,
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    padding: 35,
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    boxSizing: "border-box",
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontSize: 28,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 25,
  },
  heading: {
    textAlign: "center",
    marginBottom: 25,
  },
  label: {
    display: "block",
    marginBottom: 8,
    marginTop: 18,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #ccc",
    borderRadius: 6,
    fontSize: 15,
  },
  button: {
    width: "100%",
    marginTop: 24,
    padding: 12,
    border: "none",
    borderRadius: 6,
    background: "#2563eb",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  message: {
    textAlign: "center",
    marginTop: 18,
    color: "#dc2626",
    fontWeight: 600,
  },
  footer: {
    textAlign: "center",
    marginTop: 24,
  },
};

export default Login;
