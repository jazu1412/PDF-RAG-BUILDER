import { PdfReader } from "pdfreader";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

async function processAllPDFsInFolder(pdfPath) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  if (typeof pdfPath === 'string') {
    return await processPDFFile(pdfPath);
  }

  const pdfFolder = path.join(__dirname, "..", "pdf");
  const files = fs.readdirSync(pdfFolder);

  const textPromises = files
    .filter((file) => file.endsWith(".pdf"))
    .map(async (file) => {
      const pdfFilePath = path.join(pdfFolder, file);
      const textData = await processPDFFile(pdfFilePath);
      return textData;
    });

  const textChunks = await Promise.all(textPromises);
  return textChunks.join("");
}

async function processPDFFile(pdfFilePath) {
  return new Promise((resolve, reject) => {
    const textChunks = [];

    new PdfReader().parseFileItems(pdfFilePath, (err, item) => {
      if (item?.text) {
        textChunks.push(item.text);
      } else if (err) {
        console.log("Error Parsing!", err);
        reject(err);
      } else if (!item) {
        resolve(textChunks.join(" "));
      }
    });
  });
}

export default processAllPDFsInFolder;
