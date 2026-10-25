const express = require("express");

const {
  createInterview,
  completeInterview,
  getInterviews,
  getInterviewById,
  submitInterview,
  downloadReport,
} = require("../controllers/interviewController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new interview and generate fresh AI questions.
router.post("/", protect, createInterview);

// Get interviews belonging to the logged-in user.
router.get("/", protect, getInterviews);

// Legacy: save results computed by the client (kept for compatibility).
router.put("/complete", protect, completeInterview);

// Submit answers -> AI evaluation -> saved result.
router.post("/:id/submit", protect, submitInterview);

// Download the PDF report of a completed interview.
router.get("/:id/report", protect, downloadReport);

// Get a specific interview by ID.
router.get("/:id", protect, getInterviewById);

module.exports = router;
