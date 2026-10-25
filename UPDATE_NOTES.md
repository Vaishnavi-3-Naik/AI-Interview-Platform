# AI Interview Platform - AI interviewer + PDF report update

## Run (VS Code terminal)

    # Terminal 1 - backend
    cd server
    npm install
    npm run dev

    # Terminal 2 - frontend
    cd client
    npm install
    npm run dev

Keep your existing `server/.env` (MONGO_URI, JWT_SECRET, GEMINI_API_KEY).
See `server/.env.example` for the optional new settings.

## What changed

Server
- services/aiService.js     NEW  Gemini question generation + evaluation
- services/pdfReport.js     NEW  PDF report (pdfkit)
- assets/fonts/             NEW  DejaVu fonts (Rupee sign / symbols in the PDF)
- models/Interview.js       questionDetails, introMessage, overallFeedback added
- controllers/interviewController.js
      createInterview  -> AI generates fresh questions
      submitInterview  -> NEW  POST /api/interviews/:id/submit (AI evaluation)
      downloadReport   -> NEW  GET  /api/interviews/:id/report (PDF)
- routes/interviewRoutes.js, server.js, package.json (pdfkit)

Client
- pages/Interview.jsx       no hardcoded questions; loads AI questions from server
- pages/InterviewResult.jsx ideal answer, steps, overall assessment, PDF button
- pages/InterviewHistory.jsx PDF button per completed interview
- pages/InterviewSetup.jsx  "AI is preparing your questions" loading state
