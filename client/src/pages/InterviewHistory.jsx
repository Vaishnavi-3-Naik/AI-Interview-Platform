import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./InterviewHistory.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function InterviewHistory() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

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

      const response = await axios.get(
        `${API_URL}/api/interviews`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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
        "Interview History Error:",
        error
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      setError(
        error.response?.data?.message ||
          "Failed to load interview history."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewResult = (interview) => {
    localStorage.setItem(
      "interviewResult",
      JSON.stringify({
        interviewId: interview._id,
        jobRole: interview.jobRole,
        experience: interview.experience,
        difficulty: interview.difficulty,
        interviewType: interview.interviewType,
        questions: interview.questions || [],
        answers: interview.answers || [],
        evaluations: interview.evaluations || [],
        overallFeedback: interview.overallFeedback || {},
        score: interview.score || 0,
        completedAt: interview.completedAt,
      })
    );

    navigate("/interview/result");
  };

  const handleDownloadReport = async (interview) => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setDownloadingId(interview._id);

      const response = await axios.get(
        `${API_URL}/api/interviews/${interview._id}/report`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const disposition = response.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);

      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = match ? match[1] : "Interview-Report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Download report error:", downloadError);
      alert("Failed to download the PDF report. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="history-page">

      <header className="history-header">

        <div>
          <h1>Interview History 📋</h1>

          <p>
            Review your previous interview
            practice sessions.
          </p>
        </div>

        <button
          className="dashboard-button"
          onClick={handleDashboard}
        >
          ← Back to Dashboard
        </button>

      </header>

      <main className="history-content">

        {loading && (
          <div className="history-message">
            Loading interview history...
          </div>
        )}

        {error && !loading && (
          <div className="history-error">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          interviews.length === 0 && (
            <div className="empty-history">

              <div className="empty-icon">
                📚
              </div>

              <h2>
                No interviews yet
              </h2>

              <p>
                Complete your first AI interview
                to see your history here.
              </p>

              <button
                className="start-button"
                onClick={() =>
                  navigate("/interview/setup")
                }
              >
                Start AI Interview 🚀
              </button>

            </div>
          )}

        {!loading &&
          !error &&
          interviews.length > 0 && (

            <div className="history-list">

              {interviews.map((interview) => {

                const isCompleted =
                  interview.status === "completed";

                const score =
                  Number(interview.score || 0);

                return (
                  <div
                    className="history-card"
                    key={interview._id}
                  >

                    <div className="history-details">

                      <h2>
                        {interview.jobRole}
                      </h2>

                      <div className="history-info">

                        <span>
                          🎯{" "}
                          {interview.interviewType}
                        </span>

                        <span>
                          📊{" "}
                          {interview.difficulty}
                        </span>

                        <span>
                          👤{" "}
                          {interview.experience}
                        </span>

                      </div>

                      <p className="history-date">

                        📅{" "}
                        {isCompleted &&
                        interview.completedAt
                          ? new Date(
                              interview.completedAt
                            ).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : new Date(
                              interview.createdAt
                            ).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}

                      </p>

                    </div>

                    <div className="history-right">

                      {isCompleted ? (
                        <>
                          <div className="history-score">
                            {score}%
                          </div>

                          <button
                            className="view-result-button"
                            onClick={() =>
                              handleViewResult(
                                interview
                              )
                            }
                          >
                            View Result
                          </button>

                          <button
                            className="view-result-button"
                            onClick={() =>
                              handleDownloadReport(interview)
                            }
                            disabled={
                              downloadingId === interview._id
                            }
                          >
                            {downloadingId === interview._id
                              ? "Preparing..."
                              : "📄 PDF"}
                          </button>
                        </>
                      ) : (
                        <span className="status-badge">
                          Incomplete
                        </span>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

      </main>

    </div>
  );
}

export default InterviewHistory;