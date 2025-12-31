import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Share cookies across all gamify.* subdomains
        // In production, this enables SSO across:
        // - gamify.it.com
        // - fitness.gamify.it.com
        // - travel.gamify.it.com
      },
      cookieOptions: {
        // Domain sharing for cross-subdomain auth
        domain: process.env.NODE_ENV === 'production' ? '.gamify.it.com' : undefined,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );
}
