const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB =
  require("./config/db");

const authRoutes =
  require("./routes/authRoutes");

const interviewRoutes =
  require("./routes/interviewRoutes");

const aiRoutes =
  require("./routes/aiRoutes");

const app = express();

// ==========================================
// DATABASE
// ==========================================

connectDB();

// ==========================================
// CORS
// ==========================================

app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

// ==========================================
// BODY PARSER
// ==========================================

app.use(
  express.json({ limit: "1mb" })
);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "AI Interview Platform API is running 🚀",
  });
});

// ==========================================
// ROUTES
// ==========================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/interviews",
  interviewRoutes
);

app.use(
  "/api/ai",
  aiRoutes
);

// ==========================================
// 404
// ==========================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API route not found",
    });
  }
);

// ==========================================
// ERROR HANDLER
// ==========================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Server Error:",
      error
    );

    res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });
  }
);

// ==========================================
// START SERVER
// ==========================================

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT, "0.0.0.0", () => {
    console.log(
      `Server is running on port ${PORT}`
    );
  }
);