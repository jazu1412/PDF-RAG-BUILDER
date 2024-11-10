import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import documentUploadRoutes from "./routes/db.js";
import queryRoutes from "./routes/query.js";
import db from "./db/MongoDB.js";
import { createEmbedding } from "./utils/createEmbedding.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", async () => {
  console.log("Connected to MongoDB...");
  
  try {
    // Check if the collection exists and has documents
    const collections = await db.db.listCollections().toArray();
    const uploadedDocumentsExists = collections.some(col => col.name === 'uploadeddocuments');
    
    if (uploadedDocumentsExists) {
      const count = await db.collection('uploadeddocuments').countDocuments();
      console.log(`The 'uploadeddocuments' collection exists and has ${count} documents.`);
      
      if (count === 0) {
        await createSampleDocument();
      }
    } else {
      console.log("The 'uploadeddocuments' collection does not exist.");
      await createSampleDocument();
    }
  } catch (error) {
    console.error("Error while checking/creating sample document:", error);
  }
});

async function createSampleDocument() {
  try {
    const sampleText = "This is a sample document about artificial intelligence and machine learning.";
    const embedding = await createEmbedding(sampleText);
    
    await db.collection('uploadeddocuments').insertOne({
      description: sampleText,
      embedding: embedding
    });
    console.log("Created 'uploadeddocuments' collection with a sample document.");
    
    // Verify the document was inserted
    const insertedDoc = await db.collection('uploadeddocuments').findOne({description: sampleText});
    console.log("Inserted document:", insertedDoc);
  } catch (error) {
    console.error("Error creating sample document:", error);
  }
}

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use("/document", documentUploadRoutes);
app.use("/query", queryRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(7001, () => {
  console.log("Server running on port 7001...");
});
