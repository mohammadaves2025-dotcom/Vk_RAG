import "dotenv/config";
import { readFileSync } from "node:fs";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { connectToDatabase } from "./db.js";

const chunks = JSON.parse(readFileSync("chunks.json", "utf-8"));
console.log(`Read ${chunks.length} chunks from chunks.json`);

//EMBEDDINGS

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

const database = connectToDatabase();
const collection = database.collection("kohli_bio");

// Clear old data so re-running doesn't create duplicates
await collection.deleteMany({});

const BATCH_SIZE = 20;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries a batch if Gemini quietly returns empty vectors (usually a rate limit)
async function embedWithRetry(texts) {
  for (let attempt = 1; attempt <= 5; attempt++) {

    const vectors = await embeddings.embedDocuments(texts);

    if (vectors.every((v) => v.length > 0)) return vectors;
    
    console.log(`Empty vectors (attempt ${attempt}/5). Waiting 30s before retrying...`);
    await sleep(30000);
  }
  throw new Error("Gemini kept returning empty vectors after 5 attempts. Stopping.");
}

for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);

  const vectors = await embedWithRetry(batch.map((chunk) => chunk.pageContent));

  const docs = batch.map((chunk, j) => ({
    text: chunk.pageContent,
    source: chunk.metadata.source,
    $vector: vectors[j],
  }));

  await collection.insertMany(docs);
  console.log(`Stored ${Math.min(i + BATCH_SIZE, chunks.length)} / ${chunks.length}`);

  await sleep(2000); // short pause between batches to stay under the rate limit
}

console.log("Documents in collection:", await collection.countDocuments({}, 1000));