import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project credentials
// Tip: Use environment variables in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://plyrcsccbkipxuujeti.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBseXJjc2NjYmtpY3hwdXVqZXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzgwODMsImV4cCI6MjA5MDcxNDA4M30.hOPfsDjSUaqNccBHgPJ6zYRmF_Xrxf5kMXhLMlwKlGU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
