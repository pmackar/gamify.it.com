import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Use vanilla Supabase client for browser (same as gamify-fitness)
// This avoids PKCE issues with @supabase/ssr
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
