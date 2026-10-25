import "dotenv/config";
import express from "express";
import cors from "cors";
import { askQuestion } from "./src/rag.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const question = req.body?.question?.trim();

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }
  if (question.length > 500) {
    return res.status(400).json({ error: "Question is too long (max 500 characters)." });
  }

  try {
    res.json(await askQuestion(question));
  } catch (err) {
    console.error("askQuestion failed:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));