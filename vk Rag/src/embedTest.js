import "dotenv/config";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});
console.log("Embeddings object created successfully!");

const vector = await embeddings.embedQuery("Virat Kohli was born in Delhi.");

console.log("Dimension:", vector.length);
console.log("First 5 numbers:", vector.slice(0, 5));