import { connectToDatabase } from "./db.js";

const db = connectToDatabase();
console.log(db);

console.log("Collections:", await db.listCollections());