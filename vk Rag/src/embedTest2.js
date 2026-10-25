import "dotenv/config";
import { readFileSync } from "node:fs";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

const chunks = JSON.parse(readFileSync("chunks.json", "utf-8"));

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

try {
  const v = await embeddings.embedQuery(chunks[0].pageContent);
  console.log("embedQuery OK, dimension:", v.length);
} catch (err) {
  console.error("embedQuery FAILED:", err.message);
}

const docVectors = await embeddings.embedDocuments(
  chunks.slice(0, 3).map((c) => c.pageContent)
);
console.log("embedDocuments lengths:", docVectors.map((v) => v.length));