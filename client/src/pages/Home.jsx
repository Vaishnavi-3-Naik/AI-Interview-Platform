import { Link } from "react-router-dom";

function Home() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <h1>AI Interview Platform 🚀</h1>

        <p>
          Practice interviews with AI and improve your skills.
        </p>

        <div style={styles.buttons}>
          <Link to="/login" style={styles.loginButton}>
            Login
          </Link>

          <Link to="/register" style={styles.registerButton}>
            Create Account
          </Link>
        </div>

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
    padding: "20px",
  },

  card: {
    width: "100%",
    maxWidth: "600px",
    background: "white",
    padding: "50px",
    borderRadius: "12px",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },

  buttons: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    marginTop: "30px",
  },

  loginButton: {
    padding: "12px 25px",
    background: "#2563eb",
    color: "white",
    textDecoration: "none",
    borderRadius: "6px",
  },

  registerButton: {
    padding: "12px 25px",
    background: "#16a34a",
    color: "white",
    textDecoration: "none",
    borderRadius: "6px",
  },
};

export default Home;