import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";
  // ==========================================
  // FETCH INTERVIEWS
  // ==========================================

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/api/interviews`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Dashboard Interviews:",
        response.data
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Failed to fetch interviews"
        );
      }

      setInterviews(
        Array.isArray(response.data.interviews)
          ? response.data.interviews
          : []
      );
    } catch (error) {
      console.error(
        "Fetch Dashboard Interviews Error:",
        error
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("currentInterview");
        localStorage.removeItem("interviewId");
        localStorage.removeItem("interviewResult");

        navigate("/login");
        return;
      }

      setError(
        error.response?.data?.message ||
          "Unable to load interview statistics."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // START INTERVIEW
  // ==========================================

  const handleStartInterview = () => {
    navigate("/interview/setup");
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentInterview");
    localStorage.removeItem("interviewId");
    localStorage.removeItem("interviewResult");

    navigate("/login");
  };

  // ==========================================
  // STATISTICS
  // ==========================================

  const completedInterviews =
    interviews.filter(
      (interview) =>
        interview.status === "completed"
    );

  const interviewsCompleted =
    completedInterviews.length;

  const averageScore =
    interviewsCompleted > 0
      ? Math.round(
          completedInterviews.reduce(
            (total, interview) =>
              total +
              Number(interview.score || 0),
            0
          ) / interviewsCompleted
        )
      : 0;

  const practiceSessions =
    interviews.length;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="dashboard-page">

      <header className="dashboard-header">

        <div>
          <h1>
            AI Interview Platform 🚀
          </h1>

          <p>
            Practice. Improve. Succeed.
          </p>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </header>

      <main className="dashboard-content">

        <section className="welcome-card">

          <h2>
            Welcome to your Dashboard 👋
          </h2>

          <p>
            Prepare for your next interview with
            AI-powered interview practice.
          </p>

          <button
            className="start-button"
            onClick={handleStartInterview}
          >
            Start AI Interview 🚀
          </button>

        </section>

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        <section className="stats">

          <div className="stat-card">

            <h3>
              {loading
                ? "..."
                : interviewsCompleted}
            </h3>

            <p>
              Interviews Completed
            </p>

          </div>

          <div className="stat-card">

            <h3>
              {loading
                ? "..."
                : `${averageScore}%`}
            </h3>

            <p>
              Average Score
            </p>

          </div>

          <div className="stat-card">

            <h3>
              {loading
                ? "..."
                : practiceSessions}
            </h3>

            <p>
              Practice Sessions
            </p>

          </div>

        </section>

        {!loading &&
          completedInterviews.length > 0 && (

            <section className="recent-interviews">

              <div className="recent-header">
                <h2>
                  Recent Interviews
                </h2>
              </div>

              <div className="interview-list">

                {completedInterviews
                  .slice(0, 5)
                  .map((interview) => (

                    <div
                      className="interview-history-card"
                      key={interview._id}
                    >

                      <div>

                        <h3>
                          {interview.jobRole}
                        </h3>

                        <p>
                          {interview.interviewType}
                          {" • "}
                          {interview.difficulty}
                        </p>

                        <small>
                          {interview.completedAt
                            ? new Date(
                                interview.completedAt
                              ).toLocaleDateString()
                            : "Completed"}
                        </small>

                      </div>

                      <div className="history-score">

                        {Number(
                          interview.score || 0
                        )}
                        %

                      </div>

                    </div>

                  ))}

              </div>

            </section>

          )}

        {!loading &&
          interviews.length === 0 && (

            <section className="no-interviews">

              <h2>
                No interviews yet 📚
              </h2>

              <p>
                Start your first AI interview
                to begin tracking your progress.
              </p>

            </section>

          )}

      </main>

    </div>
  );
}

export default Dashboard;