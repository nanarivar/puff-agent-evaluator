/**
 * Backend API Route: GET /api/questions
 * 
 * Fetches questions from Supabase for a given workflow_id.
 * This endpoint runs server-side and uses the service role key securely.
 * 
 * Query parameters:
 * - workflowId: The workflow ID to filter questions by
 * 
 * Returns:
 * - 200: Array of questions
 * - 400: Missing workflowId parameter
 * - 500: Server error
 */

import { createClient } from "@supabase/supabase-js";

// Get environment variables (Node.js environment)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL environment variable");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

/**
 * Creates a Supabase client with service role key for server-side operations.
 */
function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface Question {
  id: string;
  question: string;
  workflow_id: string;
  created_at?: string;
}

export async function getQuestions(workflowId: string): Promise<Question[]> {
  if (!workflowId) {
    throw new Error("workflowId is required");
  }

  const supabase = createServerClient();

  // Build query: select id and question, filter by workflow_id, order by created_at desc (or id if no created_at)
  let query = supabase
    .from("questions")
    .select("id, question, workflow_id, created_at")
    .eq("workflow_id", workflowId);

  // Order by created_at desc if available, otherwise by id
  query = query.order("created_at", { ascending: false }).order("id", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`);
  }

  return data || [];
}
