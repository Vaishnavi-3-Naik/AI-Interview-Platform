const express = require("express");

const {
  evaluateAnswer,
} = require("../controllers/aiController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// EVALUATE ANSWER
// POST /api/ai/evaluate
// ==========================================

router.post(
  "/evaluate",
  protect,
  evaluateAnswer
);

module.exports = router;