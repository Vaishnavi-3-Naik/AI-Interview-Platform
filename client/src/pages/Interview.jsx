import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Interview.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// ==========================================
// HELPERS
// ==========================================

const readCurrentInterviewId = () => {
  try {
    const saved = JSON.parse(
      localStorage.getItem("currentInterview") || "null"
    );
    return saved?.interviewId || localStorage.getItem("interviewId");
  } catch {
    return localStorage.getItem("interviewId");
  }
};

const clearSession = () => {
  [
    "token",
    "user",
    "currentInterview",
    "interviewId",
    "interviewResult",
  ].forEach((key) => localStorage.removeItem(key));
};

function Interview() {
  const navigate = useNavigate();

  const [interviewId] = useState(readCurrentInterviewId);
  const [interview, setInterview] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const draftKey = `interviewDraft:${interviewId}`;

  // ==========================================
  // LOAD THE AI-GENERATED INTERVIEW
  // ==========================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (!interviewId) {
      navigate("/interview/setup");
      return;
    }

    let cancelled = false;

    const loadInterview = async () => {
      try {
        setPageLoading(true);
        setLoadError("");

        const response = await axios.get(
          `${API_URL}/api/interviews/${interviewId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (cancelled) return;

        const loaded = response.data?.interview;

        if (!response.data?.success || !loaded) {
          throw new Error("Interview not found.");
        }

        // Already finished? Go straight to the result.
        if (loaded.status === "completed") {
          localStorage.setItem(
            "interviewResult",
            JSON.stringify(toResult(loaded))
          );
          navigate("/interview/result", { replace: true });
          return;
        }

        const questionCount = loaded.questionDetails?.length || 0;

        // Restore any unsent draft (e.g. after a page refresh).
        let restored = Array(questionCount).fill("");
        try {
          const draft = JSON.parse(
            localStorage.getItem(draftKey) || "null"
          );
          if (Array.isArray(draft) && draft.length === questionCount) {
            restored = draft.map((item) =>
              typeof item === "string" ? item : ""
            );
          }
        } catch {
          /* ignore broken drafts */
        }

        setInterview(loaded);
        setAnswers(restored);
      } catch (error) {
        if (cancelled) return;

        if (error.response?.status === 401) {
          clearSession();
          navigate("/login");
          return;
        }

        setLoadError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load the interview."
        );
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };

    loadInterview();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, reloadKey]);

  // Save the draft whenever answers change.
  useEffect(() => {
    if (interview && answers.length > 0) {
      localStorage.setItem(draftKey, JSON.stringify(answers));
    }
  }, [answers, interview, draftKey]);

  // ==========================================
  // LOADING / ERROR SCREENS
  // ==========================================

  if (pageLoading) {
    return (
      <div className="interview-page">
        <div className="interview-card interview-status">
          <p>🤖 Loading your interview...</p>
        </div>
      </div>
    );
  }

  if (loadError || !interview) {
    return (
      <div className="interview-page">
        <div className="interview-card interview-status">
          <p className="interview-error-text">
            {loadError || "Interview not found."}
          </p>

          <div className="navigation-buttons">
            <button onClick={() => setReloadKey((key) => key + 1)}>
              Retry
            </button>

            <button
              className="next-button"
              onClick={() => navigate("/interview/setup")}
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DERIVED DATA
  // ==========================================

  const questions = interview.questionDetails || [];
  const currentQuestionData = questions[currentQuestion];
  const answeredCount = answers.filter(
    (answer) => String(answer || "").trim() !== ""
  ).length;

  // ==========================================
  // ANSWER HANDLERS
  // ==========================================

  const setAnswer = (value) => {
    const updated = [...answers];
    updated[currentQuestion] = value;
    setAnswers(updated);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // ==========================================
  // FINISH INTERVIEW  ->  server evaluates with AI
  // ==========================================

  const finishInterview = async () => {
    setMessage("");

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const unanswered = questions.length - answeredCount;

    if (
      unanswered > 0 &&
      !window.confirm(
        `${unanswered} question(s) are unanswered and will score 0. Finish anyway?`
      )
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/interviews/${interviewId}/submit`,
        { answers },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 180000,
        }
      );

      if (!response.data?.success || !response.data?.interview) {
        throw new Error(
          response.data?.message || "Failed to evaluate the interview"
        );
      }

      localStorage.setItem(
        "interviewResult",
        JSON.stringify(toResult(response.data.interview))
      );
      localStorage.removeItem(draftKey);

      navigate("/interview/result");
    } catch (error) {
      console.error("Finish Interview Error:", error);

      if (error.response?.status === 401) {
        clearSession();
        navigate("/login");
        return;
      }

      if (error.response) {
        setMessage(
          error.response.data?.message || "Failed to complete interview."
        );
      } else if (error.request) {
        setMessage(
          "Cannot connect to the backend server. Make sure the server is running."
        );
      } else {
        setMessage(error.message || "Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="interview-page">
      <div className="interview-card">
        <div className="interview-header">
          <h1>AI Interview 🤖</h1>

          <div className="interview-info">
            <span>
              <strong>Role:</strong> {interview.jobRole}
            </span>
            <span>
              <strong>Type:</strong> {interview.interviewType}
            </span>
            <span>
              <strong>Difficulty:</strong> {interview.difficulty}
            </span>
            <span>
              <strong>Experience:</strong> {interview.experience}
            </span>
          </div>
        </div>

        {interview.introMessage && currentQuestion === 0 && (
          <div className="interviewer-intro">
            <span className="interviewer-avatar">🤖</span>
            <p>{interview.introMessage}</p>
          </div>
        )}

        <div className="progress">
          Question {currentQuestion + 1} of {questions.length}
          <span className="progress-answered">
            {answeredCount}/{questions.length} answered
          </span>
        </div>

        <div className="question-dots">
          {questions.map((_, index) => {
            const done = String(answers[index] || "").trim() !== "";
            return (
              <button
                key={index}
                type="button"
                className={`question-dot${
                  index === currentQuestion ? " active" : ""
                }${done ? " done" : ""}`}
                onClick={() => setCurrentQuestion(index)}
                disabled={submitting}
                aria-label={`Go to question ${index + 1}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        <div className="question-box">
          {currentQuestionData.topic && (
            <span className="topic-chip">{currentQuestionData.topic}</span>
          )}

          <h2>{currentQuestionData.question}</h2>

          {currentQuestionData.type === "mcq" ? (
            <div className="mcq-options">
              {currentQuestionData.options.map((option, index) => {
                const selected = answers[currentQuestion] === option;

                return (
                  <button
                    key={option}
                    type="button"
                    className={
                      selected ? "mcq-option selected" : "mcq-option"
                    }
                    onClick={() => setAnswer(option)}
                    disabled={submitting}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <textarea
                value={answers[currentQuestion] || ""}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                maxLength={5000}
                disabled={submitting}
              />
              <div className="char-count">
                {(answers[currentQuestion] || "").length}/5000
              </div>
            </>
          )}
        </div>

        {message && <div className="interview-error-box">{message}</div>}

        <div className="navigation-buttons">
          <button
            onClick={previousQuestion}
            disabled={currentQuestion === 0 || submitting}
          >
            ← Previous
          </button>

          {currentQuestion < questions.length - 1 ? (
            <button
              className="next-button"
              onClick={nextQuestion}
              disabled={submitting}
            >
              Next →
            </button>
          ) : (
            <button
              className="finish-button"
              onClick={finishInterview}
              disabled={submitting}
            >
              {submitting ? "Evaluating..." : "Finish Interview ✓"}
            </button>
          )}
        </div>

        {submitting && (
          <p className="evaluating-text">
            {interview.interviewType === "Aptitude"
              ? "📝 Calculating your score..."
              : "🤖 The AI interviewer is reviewing your answers and preparing ideal answers and feedback. This can take up to a minute..."}
          </p>
        )}
      </div>
    </div>
  );
}

// Shape stored in localStorage for the Result page.
function toResult(interview) {
  return {
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
  };
}

export default Interview;
