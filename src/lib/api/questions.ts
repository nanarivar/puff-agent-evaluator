/**
 * API Client for Questions
 * 
 * Client-side utility to fetch questions from the backend API.
 * The backend API handles Supabase authentication securely with the service role key.
 */

export interface Question {
  id: string;
  question: string;
  workflow_id: string;
  created_at?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

/**
 * Fetches questions for a given workflow ID from the backend API
 * 
 * @param workflowId - The workflow ID to fetch questions for
 * @returns Promise resolving to an array of questions
 * @throws Error if the request fails
 */
export async function fetchQuestions(workflowId: string): Promise<Question[]> {
  if (!workflowId) {
    throw new Error("workflowId is required");
  }

  const url = new URL(`${API_BASE_URL}/api/questions`);
  url.searchParams.set("workflowId", workflowId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const questions: Question[] = await response.json();
  return questions;
}
