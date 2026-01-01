import { createBrowserClient } from '@supabase/ssr';

// Use custom cookie domain only in production for SSO across subdomains
const isProduction = typeof window !== 'undefined' && window.location.hostname === 'gamify.it.com';

// Debug: log env vars (remove after debugging)
if (typeof window !== 'undefined') {
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE_KEY prefix:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20));
}

export function createClient() {
  // In production, use custom cookies for cross-subdomain SSO
  // In development, use default cookie handling
  if (isProduction) {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            if (typeof document === 'undefined') return undefined;
            const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
            return match ? decodeURIComponent(match[2]) : undefined;
          },
          set(name: string, value: string, options?: { maxAge?: number; path?: string }) {
            if (typeof document === 'undefined') return;
            let cookie = `${name}=${encodeURIComponent(value)}; domain=.gamify.it.com; path=${options?.path || '/'}; SameSite=Lax; Secure`;
            if (options?.maxAge) {
              cookie += `; Max-Age=${options.maxAge}`;
            }
            document.cookie = cookie;
          },
          remove(name: string, options?: { path?: string }) {
            if (typeof document === 'undefined') return;
            document.cookie = `${name}=; domain=.gamify.it.com; path=${options?.path || '/'}; Max-Age=0; SameSite=Lax; Secure`;
          },
        },
      }
    );
  }

  // Default client for localhost/development
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
