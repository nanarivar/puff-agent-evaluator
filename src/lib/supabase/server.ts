/**
 * Supabase Server Client
 * 
 * This module creates a Supabase client using the service role key.
 * IMPORTANT: This should ONLY be used on the server-side (backend API routes).
 * The service role key bypasses Row Level Security and should NEVER be exposed to the client.
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
 * This client has full access and bypasses RLS policies.
 * 
 * @returns Supabase client instance
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
