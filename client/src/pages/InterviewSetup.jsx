
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./InterviewSetup.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function InterviewSetup() {
  const navigate = useNavigate();

  const [jobRole, setJobRole] = useState("Software Developer");
  const [experience, setExperience] = useState("Fresher");
  const [difficulty, setDifficulty] = useState("Medium");
  const [interviewType, setInterviewType] = useState("Technical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartInterview = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Ask the backend to create a NEW interview.
      const response = await axios.post(
        `${API_URL}/api/interviews`,
        {
          jobRole: jobRole.trim(),
          experience,
          difficulty,
          interviewType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          // The AI needs a few seconds to write fresh questions.
          timeout: 120000,
        }
      );

      if (!response.data?.success || !response.data?.interview?._id) {
        throw new Error(
          response.data?.message ||
            "The server did not return a valid interview."
        );
      }

      const interview = response.data.interview;

      // Clear stale data only after the new interview was created.
      [
        "currentInterview",
        "interviewId",
        "interviewResult",
        "interviewQuestions",
        "interviewAnswers",
        ...Object.keys(localStorage).filter((key) =>
          key.startsWith("interviewDraft:")
        ),
      ].forEach((key) => localStorage.removeItem(key));

      // Save the new interview ID and its preferences.
      const currentInterview = {
        interviewId: interview._id,
        jobRole: interview.jobRole || jobRole.trim(),
        experience,
        difficulty,
        interviewType,
      };

      localStorage.setItem(
        "currentInterview",
        JSON.stringify(currentInterview)
      );
      localStorage.setItem("interviewId", interview._id);

      // Navigate only after the new interview is created successfully.
      navigate("/interview", {
        state: { interviewId: interview._id },
      });
    } catch (err) {
      console.error("Create Interview Error:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create a new interview."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-page">
      <div className="setup-card">
        <h1>Setup Your Interview 🚀</h1>
        <p>Choose your interview preferences.</p>

        {error && <div className="setup-error">{error}</div>}

        <div className="form-group">
          <label>Job Role</label>
          <input
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="Enter job role"
          />
        </div>

        <div className="form-group">
          <label>Experience</label>
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          >
            <option>Fresher</option>
            <option>1-2 Years</option>
            <option>3-5 Years</option>
            <option>5+ Years</option>
          </select>
        </div>

        <div className="form-group">
          <label>Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </div>

        <div className="form-group">
          <label>Interview Type</label>
          <select
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
          >
            <option>Technical</option>
            <option>Behavioural</option>
            <option>Aptitude</option>
            <option>HR</option>
          </select>
        </div>

        <button
          className="start-interview-button"
          onClick={handleStartInterview}
          disabled={loading || !jobRole.trim()}
        >
          {loading
            ? "AI is preparing your questions..."
            : "Start Interview 🚀"}
        </button>

        {loading && (
          <p className="setup-hint">
            🤖 Writing a fresh set of questions just for you. This usually
            takes 5-15 seconds.
          </p>
        )}
      </div>
    </div>
  );
}

export default InterviewSetup;
