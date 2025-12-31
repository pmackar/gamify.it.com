import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

// Helper to get user from session (for server components)
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
