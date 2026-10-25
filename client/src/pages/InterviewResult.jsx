import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./InterviewResult.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function InterviewResult() {
  const navigate = useNavigate();

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // ==========================================
  // LOAD INTERVIEW RESULT
  // ==========================================

  let result = null;

  try {
    result = JSON.parse(
      localStorage.getItem("interviewResult") || "null"
    );
  } catch (error) {
    console.error("Invalid interviewResult data:", error);
  }

  // ==========================================
  // NO RESULT FOUND
  // ==========================================

  if (!result) {
    return (
      <div className="result-page">
        <div className="result-card">
          <h1>Interview Result</h1>

          <p className="no-result">
            No interview result found.
          </p>

          <div className="result-actions">
            <button
              type="button"
              className="new-interview-button"
              onClick={() => navigate("/interview/setup")}
            >
              🚀 Start New Interview
            </button>

            <button
              type="button"
              className="dashboard-button"
              onClick={() => navigate("/dashboard")}
            >
              🏠 Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RESULT DATA
  // ==========================================

  const {
    jobRole = "Software Developer",
    experience = "Fresher",
    difficulty = "Medium",
    interviewType = "Technical",
    questions = [],
    answers = [],
    score = 0,
    evaluations = [],
    overallFeedback = {},
    interviewId,
  } = result;

  // ==========================================
  // DOWNLOAD PDF REPORT
  // ==========================================

  const handleDownloadReport = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (!interviewId) {
      setDownloadError(
        "This result has no interview ID. Open it again from Interview History."
      );
      return;
    }

    try {
      setDownloading(true);
      setDownloadError("");

      const response = await axios.get(
        `${API_URL}/api/interviews/${interviewId}/report`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const disposition = response.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match ? match[1] : "Interview-Report.pdf";

      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download report error:", error);

      let text = "Failed to download the report. Please try again.";

      // With responseType "blob" the JSON error body is a Blob.
      if (error.response?.data instanceof Blob) {
        try {
          const parsed = JSON.parse(await error.response.data.text());
          if (parsed?.message) text = parsed.message;
        } catch {
          /* keep default message */
        }
      }

      setDownloadError(text);
    } finally {
      setDownloading(false);
    }
  };

  const answeredCount = answers.filter(
    (answer) =>
      answer !== undefined &&
      answer !== null &&
      String(answer).trim() !== ""
  ).length;

  const totalQuestions = questions.length;

  // ==========================================
  // SCORE MESSAGE
  // ==========================================

  let scoreMessage = "";
  let scoreEmoji = "";

  if (score >= 80) {
    scoreMessage =
      "Excellent performance! Keep up the great work.";
    scoreEmoji = "🎉";
  } else if (score >= 60) {
    scoreMessage =
      "Good performance! A little more practice will make you even better.";
    scoreEmoji = "👍";
  } else if (score >= 40) {
    scoreMessage =
      "You're making progress. More practice will help you improve.";
    scoreEmoji = "📚";
  } else {
    scoreMessage =
      "More practice will help you improve.";
    scoreEmoji = "📚";
  }

  // ==========================================
  // RENDER EVALUATION
  // ==========================================

  const getEvaluation = (index) => {
    return evaluations[index] || {};
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="result-page">
      <div className="result-card">

        {/* ======================================
            HEADER
        ====================================== */}

        <div className="result-header">
          <h1>
            Interview Completed 🎉
          </h1>

          <p>
            Here is your interview result.
          </p>
        </div>

        {/* ======================================
            INTERVIEW INFORMATION
        ====================================== */}

        <div className="result-info">

          <div className="info-item">
            <span className="info-label">
              Role
            </span>

            <span className="info-value">
              {jobRole}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">
              Type
            </span>

            <span className="info-value">
              {interviewType}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">
              Difficulty
            </span>

            <span className="info-value">
              {difficulty}
            </span>
          </div>

        </div>

        {/* ======================================
            SUCCESS MESSAGE
        ====================================== */}

        <div className="success-message">
          ✓ Interview saved successfully!
        </div>

        {/* ======================================
            SCORE
        ====================================== */}

        <div className="score-section">

          <div className="score-circle">
            <span className="score-number">
              {score}
            </span>

            <span className="score-percent">
              %
            </span>
          </div>

          <h2>
            {scoreEmoji} {scoreMessage}
          </h2>
        </div>

        {/* ======================================
            STATISTICS
        ====================================== */}

        <div className="result-statistics">

          <div className="stat-card">
            <span className="stat-number">
              {totalQuestions}
            </span>

            <span className="stat-label">
              Questions
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-number">
              {answeredCount}
            </span>

            <span className="stat-label">
              Answered
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-number">
              {score}%
            </span>

            <span className="stat-label">
              Score
            </span>
          </div>

        </div>

        {/* ======================================
            OVERALL AI ASSESSMENT
        ====================================== */}

        {overallFeedback?.summary && (
          <div className="overall-feedback">
            <h2>AI Overall Assessment</h2>

            <p>{overallFeedback.summary}</p>

            {Array.isArray(overallFeedback.strengths) &&
              overallFeedback.strengths.length > 0 && (
                <div className="strengths">
                  <h4>Overall Strengths</h4>
                  <ul>
                    {overallFeedback.strengths.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

            {Array.isArray(overallFeedback.improvements) &&
              overallFeedback.improvements.length > 0 && (
                <div className="improvements">
                  <h4>Overall Areas to Improve</h4>
                  <ul>
                    {overallFeedback.improvements.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {/* ======================================
            YOUR ANSWERS
        ====================================== */}

        <div className="answers-section">

          <h2>
            Your Answers
          </h2>

          {totalQuestions === 0 ? (
            <p className="no-answers">
              No answers found.
            </p>
          ) : (
            questions.map((question, index) => {

              const answer =
                answers[index] || "";

              const evaluation =
                getEvaluation(index);

              return (
                <div
                  className="answer-card"
                  key={index}
                >

                  {/* QUESTION */}

                  <h3>
                    Question {index + 1}
                  </h3>

                  <div className="question-text">
                    <strong>
                      {question}
                    </strong>
                  </div>

                  {/* ANSWER */}

                  <div className="answer-content">

                    <h4>
                      Your Answer:
                    </h4>

                    {answer ? (
                      <p>
                        {answer}
                      </p>
                    ) : (
                      <p className="empty-answer">
                        No answer was provided.
                      </p>
                    )}

                  </div>

                  {/* MCQ CORRECT ANSWER */}

                  {evaluation.correctAnswer && (
                    <div className="correct-answer">

                      <strong>
                        Correct Answer:
                      </strong>

                      <span>
                        {evaluation.correctAnswer}
                      </span>

                    </div>
                  )}

                  {/* SCORE */}

                  {evaluation.score !== undefined && (
                    <div className="evaluation-score">

                      <strong>
                        Question Score:
                      </strong>

                      <span>
                        {evaluation.score}/10
                      </span>

                    </div>
                  )}

                  {/* IDEAL / MODEL ANSWER (open-ended questions) */}

                  {evaluation.modelAnswer &&
                    !evaluation.correctAnswer && (
                      <div className="model-answer">
                        <h4>Ideal Answer (AI)</h4>
                        <p>{evaluation.modelAnswer}</p>
                      </div>
                    )}

                  {/* STEP-BY-STEP EXPLANATION */}

                  {Array.isArray(evaluation.explanationSteps) &&
                    evaluation.explanationSteps.length > 0 && (
                      <div className="explanation-steps">
                        <h4>Step-by-Step Explanation</h4>
                        <ol>
                          {evaluation.explanationSteps.map(
                            (step, stepIndex) => (
                              <li key={stepIndex}>{step}</li>
                            )
                          )}
                        </ol>
                      </div>
                    )}

                  {/* FEEDBACK */}

                  {evaluation.feedback && (
                    <div className="feedback">

                      <h4>
                        Feedback
                      </h4>

                      <p>
                        {evaluation.feedback}
                      </p>

                    </div>
                  )}

                  {/* STRENGTHS */}

                  {Array.isArray(
                    evaluation.strengths
                  ) &&
                    evaluation.strengths.length >
                      0 && (
                      <div className="strengths">

                        <h4>
                          Strengths
                        </h4>

                        <ul>
                          {evaluation.strengths.map(
                            (
                              strength,
                              strengthIndex
                            ) => (
                              <li
                                key={
                                  strengthIndex
                                }
                              >
                                {strength}
                              </li>
                            )
                          )}
                        </ul>

                      </div>
                    )}

                  {/* IMPROVEMENTS */}

                  {Array.isArray(
                    evaluation.improvements
                  ) &&
                    evaluation.improvements
                      .length > 0 && (
                      <div className="improvements">

                        <h4>
                          Improvements
                        </h4>

                        <ul>
                          {evaluation.improvements.map(
                            (
                              improvement,
                              improvementIndex
                            ) => (
                              <li
                                key={
                                  improvementIndex
                                }
                              >
                                {improvement}
                              </li>
                            )
                          )}
                        </ul>

                      </div>
                    )}

                </div>
              );
            })
          )}

        </div>

        {/* ======================================
            ACTION BUTTONS
        ====================================== */}

        {downloadError && (
          <div className="download-error">{downloadError}</div>
        )}

        <div className="result-actions">

          <button
            type="button"
            className="download-button"
            onClick={handleDownloadReport}
            disabled={downloading}
          >
            {downloading ? "Preparing PDF..." : "📄 Download PDF Report"}
          </button>

          <button
            type="button"
            className="new-interview-button"
            onClick={() => {
              localStorage.removeItem("interviewResult");
              localStorage.removeItem("currentInterview");
              localStorage.removeItem("interviewId");

              navigate("/interview/setup");
            }}
          >
            🚀 Start New Interview
          </button>

          <button
            type="button"
            className="dashboard-button"
            onClick={() => navigate("/dashboard")}
          >
            🏠 Back to Dashboard
          </button>

        </div>

      </div>
    </div>
  );
}

export default InterviewResult;