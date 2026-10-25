const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");


// Create Gemini client
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);


// Generate interview questions
const generateInterviewQuestions = async (
  jobRole,
  difficulty
) => {

  try {

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });


    const prompt = `
You are an expert technical interviewer.

Create 5 technical interview questions
for the following candidate:

Job Role: ${jobRole}
Difficulty: ${difficulty}

Return ONLY valid JSON.

The JSON must have this exact format:

{
  "questions": [
    {
      "question": "Question text",
      "type": "technical"
    }
  ]
}

Rules:

1. Create exactly 5 questions.
2. Questions must match the job role.
3. Match the requested difficulty.
4. Do not include answers.
5. Do not include markdown.
6. Return only JSON.
`;


    const result =
      await model.generateContent(prompt);


    const response =
      result.response.text();


    console.log(
      "Gemini Raw Response:",
      response
    );


    // Remove accidental markdown
    const cleanedResponse =
      response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();


    const parsedResponse =
      JSON.parse(cleanedResponse);


    return parsedResponse.questions;

  } catch (error) {

    console.error(
      "Gemini Error:",
      error
    );

    throw new Error(
      "Failed to generate interview questions"
    );
  }
};


module.exports = {
  generateInterviewQuestions,
};