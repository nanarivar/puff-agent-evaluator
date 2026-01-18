/**
 * Supabase Client for browser
 * 
 * Uses the public anon key for client-side queries.
 * Row Level Security (RLS) policies should be configured in Supabase.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cvbnzcspfsllrjceoblm.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseAnonKey) {
  console.warn("Missing VITE_SUPABASE_ANON_KEY environment variable. Supabase queries will fail.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
