import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import UploadedDocument from "../models/DocumentUpload.js";
import { createEmbedding } from "../utils/createEmbedding.js";
import processAllPDFsInFolder from "../utils/parsePDF.js";

const router = express.Router();

const chunkText = (text, maxLength = 4000) => {
  const chunks = [];
  let currentChunk = "";
  const sentences = text.split(". ");

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length < maxLength) {
      currentChunk += (currentChunk ? ". " : "") + sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk + ".");
      currentChunk = sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk + ".");
  return chunks;
};

router.post("/", async (req, res) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pdfFolderPath = path.join(__dirname, "..", "pdf");
    const files = fs.readdirSync(pdfFolderPath);
    const pdfFiles = files.filter(file => file.endsWith(".pdf"));

    const savedDocs = [];

    for (const file of pdfFiles) {
      const pdfPath = path.join(pdfFolderPath, file);
      const text = await processAllPDFsInFolder(pdfPath);
      const textChunks = chunkText(text);

      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const embedding = await createEmbedding(chunk);
        
        const newDoc = new UploadedDocument({
          title: `${file} - Part ${i + 1}`,
          description: chunk,
          fileName: file,
          embedding: embedding
        });

        const savedDoc = await newDoc.save();
        savedDocs.push(savedDoc);
      }
    }

    res.status(201).json({
      message: "Documents uploaded successfully",
      documents: savedDocs
    });
  } catch (err) {
    console.log("err: ", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  }
});

export default router;
