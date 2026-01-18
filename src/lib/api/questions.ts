/**
 * API Client for Questions
 * 
 * Client-side utility to fetch questions directly from Supabase.
 */

import { supabase } from "@/lib/supabase/client";

export interface Question {
  id: string;
  question: string;
  workflow_id: string;
  created_at?: string;
}

/**
 * Fetches questions for a given workflow ID directly from Supabase
 * 
 * @param workflowId - The workflow ID to fetch questions for
 * @returns Promise resolving to an array of questions
 * @throws Error if the request fails
 */
export async function fetchQuestions(workflowId: string): Promise<Question[]> {
  if (!workflowId) {
    throw new Error("workflowId is required");
  }

  const { data, error } = await supabase
    .from("questions")
    .select("id, question, workflow_id, created_at")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`);
  }

  return data || [];
}
