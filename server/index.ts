/**
 * Express Server for Backend API Routes
 * 
 * This server handles API endpoints that require server-side operations,
 * such as accessing Supabase with the service role key.
 * 
 * Run with: npm run server:dev (development) or npm run server (production)
 */

import express from "express";
import cors from "cors";
import { getQuestions } from "./api/questions";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * GET /api/questions
 * Fetches questions for a given workflow ID
 * 
 * Query params:
 * - workflowId: string (required) - The workflow ID to filter by
 */
app.get("/api/questions", async (req, res) => {
  try {
    const { workflowId } = req.query;

    if (!workflowId || typeof workflowId !== "string") {
      return res.status(400).json({
        error: "Missing or invalid workflowId query parameter",
      });
    }

    const questions = await getQuestions(workflowId);
    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    
    // Don't expose internal error details in production
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch questions";
    res.status(500).json({
      error: "Failed to fetch questions",
      message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
