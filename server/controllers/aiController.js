const { GoogleGenAI } = require("@google/genai");

// ==========================================
// GEMINI CLIENT
// ==========================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ==========================================
// EVALUATE INTERVIEW ANSWER
// POST /api/ai/evaluate
// ==========================================

const evaluateAnswer = async (req, res) => {
  try {
    const {
      question,
      answer,
      jobRole,
      interviewType,
      difficulty,
    } = req.body || {};

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    if (!answer || !answer.trim()) {
      return res.status(400).json({
        success: false,
        message: "Answer is required",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured",
      });
    }

    // ==========================================
    // AI PROMPT
    // ==========================================

    const prompt = `
You are an expert technical and HR interview evaluator.

Evaluate the candidate's answer fairly.

Interview details:
Job Role: ${jobRole || "Software Developer"}
Interview Type: ${interviewType || "Technical"}
Difficulty: ${difficulty || "Medium"}

Question:
${question}

Candidate Answer:
${answer}

Evaluate the answer using these criteria:

1. Correctness
2. Relevance
3. Clarity
4. Completeness
5. Technical understanding when applicable

Give a score from 0 to 10.

Return ONLY valid JSON in exactly this format:

{
  "score": 0,
  "feedback": "Short useful feedback for the candidate.",
  "strengths": [
    "Strength 1"
  ],
  "improvements": [
    "Improvement 1"
  ]
}

Rules:
- score must be a number from 0 to 10
- do not give a score above 10
- do not give a score below 0
- feedback should be concise
- strengths should contain 1 to 3 items
- improvements should contain 1 to 3 items
- do not use markdown
- return JSON only
`;

    // ==========================================
    // CALL GEMINI
    // ==========================================

    const response =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

    const text = response.text;

    console.log(
      "Gemini Evaluation Response:",
      text
    );

    // ==========================================
    // PARSE AI RESPONSE
    // ==========================================

    let evaluation;

    try {
      evaluation = JSON.parse(text);
    } catch (parseError) {
      console.error(
        "AI JSON Parse Error:",
        parseError
      );

      return res.status(500).json({
        success: false,
        message:
          "AI returned an invalid evaluation",
      });
    }

    // ==========================================
    // VALIDATE SCORE
    // ==========================================

    let score = Number(evaluation.score);

    if (Number.isNaN(score)) {
      score = 0;
    }

    score = Math.max(
      0,
      Math.min(10, score)
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      evaluation: {
        score,
        feedback:
          evaluation.feedback ||
          "No feedback available.",

        strengths:
          Array.isArray(
            evaluation.strengths
          )
            ? evaluation.strengths
            : [],

        improvements:
          Array.isArray(
            evaluation.improvements
          )
            ? evaluation.improvements
            : [],
      },
    });

  } catch (error) {
    console.error(
      "AI Evaluation Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to evaluate answer",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  evaluateAnswer,
};