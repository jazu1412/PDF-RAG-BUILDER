import { createEmbedding } from "../utils/createEmbedding.js";
import express from "express";
import PromptResponse from "../utils/createChat.js";
const router = express.Router();
import db from "../db/MongoDB.js";

router.post("/", async (req, res) => {
  try {
    const { query } = req.body;
    console.log("\n=== Query Processing Start ===");
    console.log("Received query:", query);

    const embedding = await createEmbedding(query);
    console.log("Embedding created successfully");

    async function findSimilarDocuments(embedding) {
      try {
        const collectionName = "uploadeddocuments";
        const collection = db.collection(collectionName);
        
        const totalDocs = await collection.countDocuments();
        console.log("\n=== Document Statistics ===");
        console.log("Total documents in collection:", totalDocs);

        const docsWithEmbeddings = await collection.countDocuments({ embedding: { $exists: true, $type: 'array' } });
        console.log("Documents with valid embeddings:", docsWithEmbeddings);

        const allDocs = await collection.find({}).toArray();
        const scoredDocs = allDocs.map(doc => {
          const similarity = cosineSimilarity(embedding, doc.embedding);
          return { ...doc, score: similarity };
        }).sort((a, b) => b.score - a.score);

        console.log("\n=== Top 5 Initial Matches ===");
        scoredDocs.slice(0, 5).forEach((doc, idx) => {
          console.log(`${idx + 1}. File: ${doc.fileName}`);
          console.log(`   Title: ${doc.title}`);
          console.log(`   Score: ${doc.score.toFixed(4)}`);
          console.log(`   Preview: ${doc.description.slice(0, 100)}...`);
        });

        // Check if query involves years
        const yearMentions = query.match(/\b20\d{2}\b/g) || [];
        const uniqueYears = [...new Set(yearMentions)];
        
        if (uniqueYears.length > 1) {
          // Handle multi-year comparison case
          console.log("\n=== Multi-Year Query Detected ===");
          console.log("Years mentioned:", uniqueYears);
          
          const bestMatchesByYear = {};
          for (const year of uniqueYears) {
            const yearDocs = scoredDocs.filter(doc => doc.fileName.includes(year));
            if (yearDocs.length > 0) {
              bestMatchesByYear[year] = yearDocs[0];
              console.log(`\nBest match for ${year}:`);
              console.log(`File: ${yearDocs[0].fileName}`);
              console.log(`Title: ${yearDocs[0].title}`);
              console.log(`Score: ${yearDocs[0].score.toFixed(4)}`);
              console.log(`Preview: ${yearDocs[0].description.slice(0, 100)}...`);
            } else {
              console.log(`No matches found for year ${year}`);
            }
          }
          
          const selectedDocs = Object.values(bestMatchesByYear);
          console.log("\n=== Final Selected Documents ===");
          selectedDocs.forEach((doc, idx) => {
            console.log(`${idx + 1}. ${doc.fileName} (Score: ${doc.score.toFixed(4)})`);
          });
          return selectedDocs;
        } else if (uniqueYears.length === 1) {
          // Handle single year case
          console.log("\n=== Single Year Query Detected ===");
          const targetYear = uniqueYears[0];
          console.log("Year mentioned:", targetYear);

          // Try to find exact year match first
          const exactYearDocs = scoredDocs.filter(doc => doc.fileName.includes(targetYear));
          
          if (exactYearDocs.length > 0) {
            console.log(`\nFound exact match for year ${targetYear}:`);
            console.log(`File: ${exactYearDocs[0].fileName}`);
            console.log(`Score: ${exactYearDocs[0].score.toFixed(4)}`);
            return [exactYearDocs[0]];
          } else {
            // Find closest year match
            console.log(`\nNo exact match for ${targetYear}, finding closest year...`);
            const availableYears = scoredDocs
              .map(doc => {
                const yearMatch = doc.fileName.match(/\b20\d{2}\b/);
                return yearMatch ? parseInt(yearMatch[0]) : null;
              })
              .filter(year => year !== null);

            if (availableYears.length > 0) {
              const targetYearNum = parseInt(targetYear);
              const closestYear = availableYears.reduce((prev, curr) => 
                Math.abs(curr - targetYearNum) < Math.abs(prev - targetYearNum) ? curr : prev
              );
              
              const closestDoc = scoredDocs.find(doc => doc.fileName.includes(closestYear.toString()));
              console.log(`\nSelected closest year ${closestYear}:`);
              console.log(`File: ${closestDoc.fileName}`);
              console.log(`Score: ${closestDoc.score.toFixed(4)}`);
              return [closestDoc];
            }
          }
        }

        // Default case: return top match
        console.log("\n=== Single Best Match Selected ===");
        console.log(`File: ${scoredDocs[0].fileName}`);
        console.log(`Title: ${scoredDocs[0].title}`);
        console.log(`Score: ${scoredDocs[0].score.toFixed(4)}`);
        console.log(`Preview: ${scoredDocs[0].description.slice(0, 100)}...`);
        return [scoredDocs[0]];
      } catch (err) {
        console.error("Error in findSimilarDocuments:", err);
        return [];
      }
    }

    const similarDocuments = await findSimilarDocuments(embedding);

    if (similarDocuments.length === 0) {
      console.log("\n=== No Documents Found ===");
      return res.status(404).json({
        error: "No similar documents found",
        message: "Unable to find relevant information for the given query.",
      });
    }

    let prompt;
    console.log("\n=== Selected Documents Full Content ===");
    if (similarDocuments.length > 1) {
      // For multi-year queries, create comparative prompt
      console.log("Multiple documents selected for comparison:");
      similarDocuments.forEach((doc, idx) => {
        console.log(`\nDocument ${idx + 1}:`);
        console.log(`File: ${doc.fileName}`);
        console.log(`Score: ${doc.score.toFixed(4)}`);
        console.log("Full Content:");
        console.log(doc.description);
      });

      const combinedContext = similarDocuments
        .map((doc) => `Context from ${doc.fileName} (Match Score: ${doc.score.toFixed(4)}):\n${doc.description}`)
        .join('\n\n');
      
      prompt = `Based on these contexts from different years:\n\n${combinedContext}\n\nQuery: ${query}\n\nPlease provide a detailed comparison, specifically highlighting the differences between the years mentioned. Answer:`;
    } else {
      // For regular queries, use simple prompt
      const doc = similarDocuments[0];
      console.log("Single document selected:");
      console.log(`File: ${doc.fileName}`);
      console.log(`Score: ${doc.score.toFixed(4)}`);
      console.log("Full Content:");
      console.log(doc.description);

      prompt = `Based on this context from ${doc.fileName} (Match Score: ${doc.score.toFixed(4)}):\n${doc.description}\n\nQuery: ${query}\n\nAnswer:`;
    }

    console.log("\n=== Full Prompt Sent to OpenAI ===");
    console.log(prompt);

    console.log("\n=== Generating Response ===");
    const answer = await PromptResponse(prompt);
    console.log("Response generated successfully");
    res.send(answer);
  } catch (err) {
    console.error("\n=== Error in Query Processing ===");
    console.error("Error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
});

// Add a route to get all documents
router.get("/all", async (req, res) => {
  try {
    const collection = db.collection("uploadeddocuments");
    const documents = await collection.find({}).toArray();
    res.json(documents);
  } catch (err) {
    console.error("Error retrieving all documents:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

// Cosine similarity function
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export default router;
