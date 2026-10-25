const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    jobRole: { type: String, required: true },
    experience: { type: String, required: true },
    difficulty: { type: String, required: true },
    interviewType: { type: String, required: true },

    // Plain question text (kept as strings so older screens keep working).
    questions: { type: Array, default: [] },

    // Full AI-generated question objects:
    // { question, topic, type: "text" | "mcq", options?, correctAnswer?, explanationSteps? }
    // correctAnswer is NEVER sent to the browser until the interview is completed.
    questionDetails: { type: Array, default: [] },

    // Friendly opening line from the AI interviewer.
    introMessage: { type: String, default: "" },

    answers: { type: Array, default: [] },

    // Per question: { question, answer, score, feedback, strengths,
    //                 improvements, modelAnswer, explanationSteps, ... }
    evaluations: { type: Array, default: [] },

    // Overall AI assessment: { summary, strengths[], improvements[] }
    overallFeedback: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    score: { type: Number, default: 0 },

    // created | in_progress | completed
    status: { type: String, default: "created" },

    completedAt: { type: Date },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model("Interview", interviewSchema);
