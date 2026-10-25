
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }
      );

      if (response.data.success) {
        setMessage("Registration successful! Redirecting to login...");

        setTimeout(() => {
          navigate("/login");
        }, 1000);
      } else {
        setMessage(response.data.message || "Registration failed");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Cannot register. Check the backend server and database."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>AI Interview Platform</h1>
        <p style={styles.subtitle}>Create your account</p>
        <h2 style={styles.heading}>Register</h2>

        <form onSubmit={handleRegister}>
          <label style={styles.label}>Full Name</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          <button style={styles.button} disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {message && (
          <p
            role="status"
            style={{
              color: message.startsWith("Registration successful")
                ? "#16a34a"
                : "#dc2626",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            {message}
          </p>
        )}

        <p style={styles.footer}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f6f8",
    padding: 20,
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 32,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    boxSizing: "border-box",
  },
  title: {
    textAlign: "center",
    fontSize: 26,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
  },
  heading: {
    textAlign: "center",
    margin: "24px 0",
  },
  label: {
    display: "block",
    fontWeight: 600,
    marginTop: 16,
    marginBottom: 8,
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
  footer: {
    textAlign: "center",
    marginTop: 24,
  },
};

export default Register;
