import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import "dotenv/config";
import { connectToDatabase } from "./db.js";
import { writeFileSync } from "node:fs";


const urls = [
  "https://en.wikipedia.org/wiki/Virat_Kohli",
  "https://en.wikipedia.org/wiki/Royal_Challengers_Bengaluru",
  "https://en.wikipedia.org/wiki/India_national_cricket_team",
  "https://en.wikipedia.org/wiki/2011_Cricket_World_Cup",
  "https://en.wikipedia.org/wiki/Anushka_Sharma",
  "https://en.wikipedia.org/wiki/Indian_Premier_League",
];

// Created BEFORE the loop so every pass can add to it
const allDocs = [];

for (const url of urls) {

  const loader = new PuppeteerWebBaseLoader(url, {

    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded" },

    // Runs after the page loads. Whatever string it returns becomes pageContent.
    evaluate: async (page) => {
      return await page.evaluate(() => {
        const article = document.querySelector("#mw-content-text");
        return article ? article.innerText : "";
      });
    },
  });

  const docs = await loader.load(); // load() returns an array of Documents
  allDocs.push(...docs); // spread: add each item of docs into allDocs

  console.log(`Loaded ${url} -> ${docs[0].pageContent.length} characters`);
}

console.log("Total documents:", allDocs.length);
console.log("First document metadata:", allDocs[0].metadata);
console.log("First 500 characters:\n", allDocs[0].pageContent.slice(0, 500));

//CHUNKING

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })

const chunks = await splitter.splitDocuments(allDocs);

console.log("Total chunks:", chunks.length);
console.log("Chunk 50 metadata:", chunks[50].metadata);
console.log("Chunk 50 text:\n", chunks[50].pageContent);

console.log("END of chunk 50:", chunks[50].pageContent.slice(-200));
console.log("START of chunk 51:", chunks[51].pageContent.slice(0, 200));

//Scraping is slow and embedding costs API calls. If the embedding or storing step fails, you’d re-scrape six pages every time you retry. With two scripts, you scrape once and then retry only the part that broke.
//Each file has one job, so when something fails you know which stage to look at.

writeFileSync("chunks.json", JSON.stringify(chunks, null, 2));
console.log(`Saved ${chunks.length} chunks to chunks.json`);