const mongoose = require("mongoose");
const Interview = require("../models/Interview");
const User = require("../models/User");
const {
  generateInterviewQuestions,
  evaluateOpenEndedAnswers,
  evaluateMcqAnswers,
} = require("../services/aiService");
const { buildInterviewReport } = require("../services/pdfReport");

const QUESTION_COUNT = Number(process.env.INTERVIEW_QUESTION_COUNT) || 5;

// ==========================================
// HELPERS
// ==========================================

const sendError = (res, error, fallbackMessage) => {
  const status = error.status && error.status < 600 ? error.status : 500;
  return res.status(status).json({
    success: false,
    message: status === 500 ? fallbackMessage : error.message,
    ...(status === 500 ? { error: error.message } : {}),
  });
};

// While an interview is running the browser must NOT receive the answer key.
const toClientInterview = (interview) => {
  if (!interview || interview.status === "completed") return interview;

  return {
    ...interview,
    questionDetails: (interview.questionDetails || []).map(
      ({ question, topic, type, options }) => ({
        question,
        topic,
        type,
        ...(type === "mcq" ? { options } : {}),
      })
    ),
    answers: [],
    evaluations: [],
  };
};

// Questions this user has already seen -> never repeated in a new interview.
const getPreviousQuestions = async (userId, interviewType) => {
  const past = await Interview.find({ user: userId, interviewType })
    .sort({ createdAt: -1 })
    .limit(15)
    .select("questions")
    .lean();

  return past
    .flatMap((item) => item.questions || [])
    .filter((q) => typeof q === "string" && q.trim());
};

// ==========================================
// CREATE INTERVIEW
// POST /api/interviews
// Generates a brand new set of AI questions.
// ==========================================
const createInterview = async (req, res) => {
  try {
    const { jobRole, experience, difficulty, interviewType } =
      req.body || {};

    if (!jobRole || !experience || !difficulty || !interviewType) {
      return res.status(400).json({
        success: false,
        message: "All interview fields are required",
      });
    }

    const allowedTypes = ["Technical", "Behavioural", "Aptitude", "HR"];
    if (!allowedTypes.includes(interviewType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview type",
      });
    }

    const cleanRole = String(jobRole).trim().slice(0, 100);

    const previousQuestions = await getPreviousQuestions(
      req.user.userId,
      interviewType
    );

    const { intro, questions } = await generateInterviewQuestions({
      jobRole: cleanRole,
      experience,
      difficulty,
      interviewType,
      previousQuestions,
      count: QUESTION_COUNT,
    });

    const interview = await Interview.create({
      user: req.user.userId,
      jobRole: cleanRole,
      experience,
      difficulty,
      interviewType,
      questions: questions.map((q) => q.question),
      questionDetails: questions,
      introMessage: intro,
      answers: [],
      evaluations: [],
      score: 0,
      status: "in_progress",
    });

    return res.status(201).json({
      success: true,
      message: "Interview created successfully",
      interview: toClientInterview(interview.toObject()),
    });
  } catch (error) {
    console.error("Create Interview Error:", error);
    return sendError(res, error, "Failed to create interview");
  }
};

// ==========================================
// GET ALL INTERVIEWS
// ==========================================
const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      user: req.user.userId,
    })
      .select("-questionDetails")
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: interviews.length,
      interviews,
    });
  } catch (error) {
    console.error("Get Interviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch interviews",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE INTERVIEW
// ==========================================
const getInterviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    const interview = await Interview.findOne({
      _id: id,
      user: req.user.userId,
    }).lean();

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    return res.status(200).json({
      success: true,
      interview: toClientInterview(interview),
    });
  } catch (error) {
    console.error(
      "Get Interview By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch interview",
      error: error.message,
    });
  }
};

// ==========================================
// COMPLETE INTERVIEW
// ==========================================
const completeInterview = async (req, res) => {
  try {
    console.log(
      "Complete Interview Request:",
      req.body
    );

    const {
      interviewId,
      questions,
      answers,
      score,
      evaluations,
    } = req.body || {};

    // ==========================================
    // VALIDATE INTERVIEW ID
    // ==========================================

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: "Interview ID is required",
      });
    }

    // ==========================================
    // FIND INTERVIEW
    // ==========================================

    const interview = await Interview.findOne({
      _id: interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // ==========================================
    // PREPARE UPDATE DATA
    // ==========================================

    const updateData = {
      status: "completed",
      completedAt: new Date(),
    };

    if (Array.isArray(questions)) {
      updateData.questions = questions;
    }

    if (Array.isArray(answers)) {
      updateData.answers = answers;
    }

    if (Array.isArray(evaluations)) {
      updateData.evaluations = evaluations;
    }

    if (
      typeof score === "number" &&
      !Number.isNaN(score)
    ) {
      updateData.score = score;
    } else {
      updateData.score = 0;
    }

    // ==========================================
    // UPDATE USING findOneAndUpdate
    // ==========================================
    //
    // IMPORTANT:
    // We intentionally use findOneAndUpdate()
    // instead of modifying the Mongoose document
    // and calling save().
    //
    // This prevents the VersionError you previously
    // encountered when the same interview document
    // was being modified more than once.
    //
    // ==========================================

    const completedInterview =
      await Interview.findOneAndUpdate(
        {
          _id: interviewId,
          user: req.user.userId,
        },
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

    if (!completedInterview) {
      return res.status(404).json({
        success: false,
        message: "Interview could not be updated",
      });
    }

    console.log(
      "Interview Completed:",
      completedInterview
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "Interview completed successfully 🎉",
      interview: completedInterview,
    });
  } catch (error) {
    console.error(
      "Complete Interview Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to complete interview",
      error: error.message,
    });
  }
};

// ==========================================
// SUBMIT INTERVIEW (AI evaluation happens here)
// POST /api/interviews/:id/submit
// body: { answers: string[] }
// ==========================================
const submitInterview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    const interview = await Interview.findOne({
      _id: id,
      user: req.user.userId,
    }).lean();

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Idempotent: a double click / retry never re-evaluates.
    if (interview.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Interview was already completed",
        interview,
      });
    }

    const details = interview.questionDetails || [];

    if (details.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This interview has no questions to evaluate.",
      });
    }

    const rawAnswers = Array.isArray(req.body?.answers)
      ? req.body.answers
      : [];

    const answers = details.map((_, index) =>
      typeof rawAnswers[index] === "string"
        ? rawAnswers[index].trim().slice(0, 5000)
        : ""
    );

    // ---- evaluate ----
    let result;

    if (interview.interviewType === "Aptitude") {
      result = evaluateMcqAnswers(details, answers);
    } else {
      result = await evaluateOpenEndedAnswers(
        {
          jobRole: interview.jobRole,
          experience: interview.experience,
          difficulty: interview.difficulty,
          interviewType: interview.interviewType,
        },
        details.map((detail, index) => ({
          index,
          question: detail.question,
          answer: answers[index],
        }))
      );
    }

    const evaluations = details.map((detail, index) => ({
      question: detail.question,
      topic: detail.topic || "",
      answer: answers[index],
      ...(detail.type === "mcq"
        ? { correctAnswer: detail.correctAnswer }
        : {}),
      ...result.evaluations[index],
    }));

    const totalScore = evaluations.reduce(
      (sum, item) => sum + Number(item.score || 0),
      0
    );

    const overallScore = Math.round(
      (totalScore / (evaluations.length * 10)) * 100
    );

    const completed = await Interview.findOneAndUpdate(
      {
        _id: id,
        user: req.user.userId,
        status: { $ne: "completed" },
      },
      {
        $set: {
          answers,
          evaluations,
          overallFeedback: result.overall,
          score: overallScore,
          status: "completed",
          completedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    // Someone else completed it between our read and write.
    if (!completed) {
      const existing = await Interview.findOne({
        _id: id,
        user: req.user.userId,
      }).lean();

      return res.status(200).json({ success: true, interview: existing });
    }

    return res.status(200).json({
      success: true,
      message: "Interview completed successfully",
      interview: completed,
    });
  } catch (error) {
    console.error("Submit Interview Error:", error);
    return sendError(res, error, "Failed to evaluate interview");
  }
};

// ==========================================
// DOWNLOAD PDF REPORT
// GET /api/interviews/:id/report
// ==========================================
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    const interview = await Interview.findOne({
      _id: id,
      user: req.user.userId,
    }).lean();

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (interview.status !== "completed") {
      return res.status(409).json({
        success: false,
        message: "Finish the interview to download its report.",
      });
    }

    const user = await User.findById(req.user.userId)
      .select("name email")
      .lean();

    const pdf = await buildInterviewReport({ interview, user: user || {} });

    const safeRole = String(interview.jobRole)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "Interview";

    const datePart = new Date(interview.completedAt || Date.now())
      .toISOString()
      .slice(0, 10);

    const fileName = `Interview-Report-${safeRole}-${datePart}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdf.length,
      "Cache-Control": "no-store",
    });

    return res.status(200).send(pdf);
  } catch (error) {
    console.error("Download Report Error:", error);
    return sendError(res, error, "Failed to generate the PDF report");
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createInterview,
  getInterviews,
  getInterviewById,
  completeInterview,
  submitInterview,
  downloadReport,
};