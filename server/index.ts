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
 * POST /api/n8n/workflows
 * Proxies requests to n8n API to avoid CORS issues
 * 
 * Body:
 * - baseUrl: string (required) - n8n base URL
 * - apiKey: string (required) - n8n API key
 * - cursor: string (optional) - pagination cursor
 */
app.post("/api/n8n/workflows", async (req, res) => {
  try {
    const { baseUrl, apiKey, cursor } = req.body;

    if (!baseUrl || typeof baseUrl !== "string") {
      return res.status(400).json({
        error: "Missing or invalid baseUrl",
      });
    }

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({
        error: "Missing or invalid apiKey",
      });
    }

    // Normalize base URL (remove trailing slash)
    const normalizedUrl = baseUrl.replace(/\/+$/, "");
    
    // Build n8n API endpoint
    const endpoint = cursor 
      ? `${normalizedUrl}/api/v1/workflows/?cursor=${cursor}`
      : `${normalizedUrl}/api/v1/workflows/`;

    // Make request to n8n API from server (no CORS restrictions)
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-N8N-API-KEY": apiKey,
      },
    });

    if (!response.ok) {
      const statusText = response.statusText || "Unknown error";
      return res.status(response.status).json({
        error: `HTTP ${response.status}: ${statusText}`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error proxying n8n request:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch workflows";
    res.status(500).json({
      error: "Failed to fetch workflows",
      message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
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
