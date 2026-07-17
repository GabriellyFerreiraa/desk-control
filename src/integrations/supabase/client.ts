// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://vpawitpwbtsztovpsnno.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYXdpdHB3YnRzenRvdnBzbm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MzAyNjAsImV4cCI6MjA3MDAwNjI2MH0.GseNS4IsxBW06-6koBi7lyoHk8d3IUDjbUD4Y4rTikU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});