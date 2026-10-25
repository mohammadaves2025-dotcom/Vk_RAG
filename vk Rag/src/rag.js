import "dotenv/config";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { connectToDatabase } from "./db.js";

const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
];
const MIN_SIMILARITY = 0.8;
const NO_ANSWER = "I don't have that in my sources.";

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  taskType: TaskType.RETRIEVAL_QUERY,
  apiKey,
});
const collection = connectToDatabase().collection("kohli_bio");

const SYSTEM_PROMPT = `You answer questions about Virat Kohli using ONLY the context provided by the user.
If the context does not contain the answer, reply exactly: "${NO_ANSWER}"
Do not use outside knowledge. Keep answers concise and factual.`;

export async function askQuestion(question) {
  const queryVector = await embeddings.embedQuery(question);

  const results = await collection
    .find({}, { sort: { $vector: queryVector }, limit: 4, includeSimilarity: true })
    .toArray();

  // Layer 1: off-topic questions never reach the model
  if (results.length === 0 || results[0].$similarity < MIN_SIMILARITY) {
    return { answer: NO_ANSWER, sources: [] };
  }

  const context = results
    .map((doc, i) => `[${i + 1}] (${doc.source})\n${doc.text}`)
    .join("\n\n");

  let response;
  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const activeLlm = new ChatGoogleGenerativeAI({
        model: modelName,
        temperature: 0,
        apiKey,
      });
      response = await activeLlm.invoke([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
      ]);
      if (response && response.content) {
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${modelName} failed, falling back:`, err.message);
    }
  }

  if (!response) {
    throw lastError || new Error("Failed to generate response from Gemini models");
  }

  // content is usually a string, but can be a list of parts
  const answer =
    typeof response.content === "string"
      ? response.content
      : response.content.map((part) => part.text ?? "").join("");

  // Layer 2: if the model said it doesn't know, don't list sources
  const sources = answer.startsWith("I don't have that")
    ? []
    : [...new Set(results.map((doc) => doc.source))];

  return { answer, sources };
}