"use strict";

// ==========================================================
// PDF REPORT
// Builds the downloadable interview report with pdfkit.
// Contains, for every question (in order):
//   question / your answer / ideal answer / step-by-step
//   explanation / AI evaluation & feedback
// ==========================================================

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const FONT_DIR = path.join(__dirname, "..", "assets", "fonts");

const COLORS = {
  primary: "#4f46e5",
  dark: "#111827",
  text: "#1f2937",
  muted: "#6b7280",
  line: "#e5e7eb",
  green: "#15803d",
  amber: "#b45309",
  red: "#b91c1c",
  slate: "#334155",
  track: "#e5e7eb",
};

// ----------------------------------------------------------
// FONTS (DejaVu supports the Rupee sign and many other symbols)
// ----------------------------------------------------------

const registerFonts = (doc) => {
  const files = {
    DejaVu: "DejaVuSans.ttf",
    "DejaVu-Bold": "DejaVuSans-Bold.ttf",
    "DejaVu-Italic": "DejaVuSans-Oblique.ttf",
    "DejaVu-Mono": "DejaVuSansMono.ttf",
  };

  const allPresent = Object.values(files).every((file) =>
    fs.existsSync(path.join(FONT_DIR, file))
  );

  if (!allPresent) {
    return {
      regular: "Helvetica",
      bold: "Helvetica-Bold",
      italic: "Helvetica-Oblique",
      mono: "Courier",
      unicode: false,
    };
  }

  Object.entries(files).forEach(([name, file]) =>
    doc.registerFont(name, path.join(FONT_DIR, file))
  );

  return {
    regular: "DejaVu",
    bold: "DejaVu-Bold",
    italic: "DejaVu-Italic",
    mono: "DejaVu-Mono",
    unicode: true,
  };
};

// ----------------------------------------------------------
// TEXT HELPERS
// ----------------------------------------------------------

const makeCleaner = (unicode) => (value) => {
  let text = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    // emoji & variation selectors are not in the fonts
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu, "")
    .trim();

  if (!unicode) {
    text = text
      .replace(/₹/g, "Rs. ")
      .replace(/[^\x09\x0A\x20-\x7E\u00A0-\u00FF•–—‘’“”…]/g, "?");
  }
  return text;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const scoreColor = (percent) =>
  percent >= 70 ? COLORS.green : percent >= 40 ? COLORS.amber : COLORS.red;

const performanceLabel = (percent) =>
  percent >= 80
    ? "Excellent"
    : percent >= 60
    ? "Good"
    : percent >= 40
    ? "Needs Improvement"
    : "Needs Significant Practice";

// ----------------------------------------------------------
// MAIN BUILDER
// ----------------------------------------------------------

/**
 * @param {{interview: object, user: {name?: string, email?: string}}} data
 * @returns {Promise<Buffer>}
 */
const buildInterviewReport = ({ interview, user = {} }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: `Interview Report - ${interview.jobRole}`,
          Author: "AI Interview Platform",
          Subject: `${interview.interviewType} interview report`,
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const F = registerFonts(doc);
      const clean = makeCleaner(F.unicode);

      const L = doc.page.margins.left;
      const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const bottomLimit = () => doc.page.height - doc.page.margins.bottom;

      const ensureSpace = (height) => {
        if (doc.y + height > bottomLimit()) doc.addPage();
      };

      // ---------- building blocks ----------

      const sectionLabel = (label, color) => {
        ensureSpace(40);
        doc
          .font(F.bold)
          .fontSize(8.5)
          .fillColor(color)
          .text(label.toUpperCase(), L, doc.y, {
            width: W,
            characterSpacing: 0.6,
          });
        doc.moveDown(0.25);
      };

      const paragraph = (text, options = {}) => {
        doc
          .font(options.font || F.regular)
          .fontSize(options.size || 10.5)
          .fillColor(options.color || COLORS.text)
          .text(clean(text), L, doc.y, { width: W, lineGap: 2.5 });
      };

      const textSection = (label, text, color = COLORS.muted) => {
        sectionLabel(label, color);
        paragraph(text);
        doc.moveDown(0.7);
      };

      const listSection = (label, items, color, ordered = false) => {
        if (!items || items.length === 0) return;
        sectionLabel(label, color);

        items.forEach((item, index) => {
          const text = clean(item);
          doc.font(F.regular).fontSize(10.5);
          const height = doc.heightOfString(text, {
            width: W - 24,
            lineGap: 2.5,
          });
          ensureSpace(height + 6);

          const y = doc.y;
          doc
            .fillColor(color)
            .font(F.bold)
            .text(ordered ? `${index + 1}.` : "•", L + 4, y, {
              width: 18,
              lineBreak: false,
            });
          doc
            .font(F.regular)
            .fillColor(COLORS.text)
            .text(text, L + 24, y, { width: W - 24, lineGap: 2.5 });

          doc.y = Math.max(doc.y, y + height) + 3;
        });

        doc.moveDown(0.5);
      };

      // ---------- data ----------

      const details = Array.isArray(interview.questionDetails)
        ? interview.questionDetails
        : [];
      const questions =
        details.length > 0
          ? details.map((d) => d.question)
          : Array.isArray(interview.questions)
          ? interview.questions
          : [];
      const answers = Array.isArray(interview.answers) ? interview.answers : [];
      const evaluations = Array.isArray(interview.evaluations)
        ? interview.evaluations
        : [];
      const overall = interview.overallFeedback || {};
      const percent = Math.max(0, Math.min(100, Number(interview.score) || 0));

      // ---------- HEADER BAND ----------

      doc.rect(0, 0, doc.page.width, 105).fill(COLORS.primary);
      doc
        .fillColor("#ffffff")
        .font(F.bold)
        .fontSize(24)
        .text("AI Interview Report", L, 30, { width: W, lineBreak: false });
      doc
        .font(F.regular)
        .fontSize(11)
        .text(
          clean(`${interview.jobRole}  •  ${interview.interviewType} Interview`),
          L,
          66,
          { width: W, lineBreak: false }
        );
      doc.y = 125;
      doc.x = L;

      // ---------- META GRID ----------

      const meta = [
        ["Candidate", user.name || "-"],
        ["Email", user.email || "-"],
        ["Job role", interview.jobRole],
        ["Experience", interview.experience],
        ["Difficulty", interview.difficulty],
        ["Interview type", interview.interviewType],
        ["Date", formatDate(interview.completedAt || interview.createdAt)],
        ["Questions", String(questions.length)],
      ];

      const colWidth = W / 2;
      const rowHeight = 36;
      let metaTop = doc.y;

      meta.forEach(([label, value], index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = L + col * colWidth;
        const y = metaTop + row * rowHeight;

        doc
          .font(F.regular)
          .fontSize(8.5)
          .fillColor(COLORS.muted)
          .text(label.toUpperCase(), x, y, {
            width: colWidth - 10,
            lineBreak: false,
            characterSpacing: 0.5,
          });
        doc
          .font(F.bold)
          .fontSize(11)
          .fillColor(COLORS.dark)
          .text(clean(value), x, y + 12, {
            width: colWidth - 10,
            lineBreak: false,
            ellipsis: true,
          });
      });

      doc.y = metaTop + Math.ceil(meta.length / 2) * rowHeight + 6;
      doc.x = L;

      // ---------- OVERALL SCORE ----------

      ensureSpace(90);
      const scoreTop = doc.y;
      doc
        .moveTo(L, scoreTop)
        .lineTo(L + W, scoreTop)
        .strokeColor(COLORS.line)
        .lineWidth(1)
        .stroke();

      doc
        .font(F.bold)
        .fontSize(34)
        .fillColor(scoreColor(percent))
        .text(`${percent}%`, L, scoreTop + 14, {
          width: 130,
          lineBreak: false,
        });

      doc
        .font(F.bold)
        .fontSize(13)
        .fillColor(COLORS.dark)
        .text(performanceLabel(percent), L + 140, scoreTop + 18, {
          width: W - 140,
          lineBreak: false,
        });

      const barY = scoreTop + 44;
      doc.roundedRect(L + 140, barY, W - 140, 9, 4).fill(COLORS.track);
      if (percent > 0) {
        doc
          .roundedRect(L + 140, barY, ((W - 140) * percent) / 100, 9, 4)
          .fill(scoreColor(percent));
      }

      doc.y = scoreTop + 70;
      doc.x = L;

      // ---------- OVERALL AI FEEDBACK ----------

      if (overall.summary) {
        textSection("Overall AI assessment", overall.summary, COLORS.primary);
      }
      listSection("Overall strengths", overall.strengths, COLORS.green);
      listSection("Overall areas to improve", overall.improvements, COLORS.amber);

      // ---------- QUESTION BY QUESTION ----------

      doc.addPage();
      doc
        .font(F.bold)
        .fontSize(16)
        .fillColor(COLORS.dark)
        .text("Question-by-Question Breakdown", L, doc.y, { width: W });
      doc.moveDown(0.8);

      questions.forEach((questionText, index) => {
        const detail = details[index] || {};
        const evaluation = evaluations[index] || {};
        const answer = String(answers[index] ?? "").trim();
        const isMcq = detail.type === "mcq";
        const qScore = Number(evaluation.score);
        const hasScore = !Number.isNaN(qScore);

        // Question header bar
        ensureSpace(130);
        const barTop = doc.y;
        doc.rect(L, barTop, W, 26).fill(COLORS.slate);
        doc
          .fillColor("#ffffff")
          .font(F.bold)
          .fontSize(11)
          .text(`Question ${index + 1}`, L + 10, barTop + 8, {
            width: W - 130,
            lineBreak: false,
          });
        if (hasScore) {
          doc.text(`Score: ${qScore}/10`, L + W - 120, barTop + 8, {
            width: 110,
            align: "right",
            lineBreak: false,
          });
        }
        doc.y = barTop + 36;
        doc.x = L;

        if (detail.topic) {
          doc
            .font(F.italic)
            .fontSize(9)
            .fillColor(COLORS.muted)
            .text(`Topic: ${clean(detail.topic)}`, L, doc.y, { width: W });
          doc.moveDown(0.2);
        }

        doc
          .font(F.bold)
          .fontSize(12)
          .fillColor(COLORS.dark)
          .text(clean(questionText), L, doc.y, { width: W, lineGap: 2.5 });
        doc.moveDown(0.5);

        // MCQ options
        if (isMcq && Array.isArray(detail.options)) {
          detail.options.forEach((option, optionIndex) => {
            const letter = String.fromCharCode(65 + optionIndex);
            const isCorrect = option === detail.correctAnswer;
            const isChosen = option === answer;
            const color = isCorrect
              ? COLORS.green
              : isChosen
              ? COLORS.red
              : COLORS.text;
            const tag = isCorrect
              ? "  (correct answer)"
              : isChosen
              ? "  (your choice)"
              : "";
            const line = clean(`${letter}.  ${option}${tag}`);

            doc.font(isCorrect || isChosen ? F.bold : F.regular).fontSize(10.5);
            ensureSpace(
              doc.heightOfString(line, { width: W - 16, lineGap: 2 }) + 4
            );
            doc.fillColor(color).text(line, L + 12, doc.y, {
              width: W - 16,
              lineGap: 2,
            });
          });
          doc.moveDown(0.6);
        }

        // 1) Candidate answer
        textSection(
          "Your answer",
          answer || "(No answer was provided)",
          COLORS.slate
        );

        // 2) Ideal / model answer
        const modelAnswer =
          evaluation.modelAnswer || evaluation.correctAnswer || detail.correctAnswer;
        if (modelAnswer) {
          textSection("Ideal / model answer (AI generated)", modelAnswer, COLORS.green);
        }

        // 3) Step-by-step explanation
        listSection(
          "Step-by-step explanation",
          evaluation.explanationSteps,
          COLORS.primary,
          true
        );

        // 4) AI evaluation & feedback
        if (evaluation.feedback) {
          textSection("AI evaluation & feedback", evaluation.feedback, COLORS.primary);
        }
        listSection("Strengths", evaluation.strengths, COLORS.green);
        listSection("Areas to improve", evaluation.improvements, COLORS.amber);

        // divider between questions
        if (index < questions.length - 1) {
          ensureSpace(24);
          const y = doc.y + 4;
          doc
            .moveTo(L, y)
            .lineTo(L + W, y)
            .dash(3, { space: 3 })
            .strokeColor(COLORS.line)
            .lineWidth(1)
            .stroke()
            .undash();
          doc.y = y + 18;
          doc.x = L;
        }
      });

      // ---------- FOOTERS ----------

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        // Writing inside the bottom margin would otherwise add a new page.
        doc.page.margins.bottom = 0;
        doc
          .font(F.regular)
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text(
            `AI Interview Platform  •  Generated ${formatDate()}  •  Page ${
              i - range.start + 1
            } of ${range.count}`,
            L,
            doc.page.height - 34,
            { width: W, align: "center", lineBreak: false }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

module.exports = { buildInterviewReport };
