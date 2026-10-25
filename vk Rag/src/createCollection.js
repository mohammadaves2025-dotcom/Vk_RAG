import { connectToDatabase } from "./db.js";

const COLLECTION_NAME = "kohli_bio";

const database = connectToDatabase();

await database.createCollection(COLLECTION_NAME, {
  vector: { dimension: 3072, metric: "cosine" },
});

console.log("Created collection:", COLLECTION_NAME);