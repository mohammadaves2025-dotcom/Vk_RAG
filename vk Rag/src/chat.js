import { askQuestion } from "./rag.js";

const question = process.argv.slice(2).join(" ");
if (!question) {
  console.log('Usage: node src/chat.js "your question"');
  process.exit(1);
}

const { answer, sources } = await askQuestion(question);
console.log("\nAnswer:\n" + answer);
if (sources.length) {
  console.log("\nSources:");
  sources.forEach((url) => console.log("-", url));
}