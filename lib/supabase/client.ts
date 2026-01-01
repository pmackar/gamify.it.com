import { createBrowserClient } from '@supabase/ssr';

// Shared cookie domain for SSO across all gamify.it.com subdomains
const COOKIE_DOMAIN = '.gamify.it.com';

export function createClient() {
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
          let cookie = `${name}=${encodeURIComponent(value)}; domain=${COOKIE_DOMAIN}; path=${options?.path || '/'}; SameSite=Lax; Secure`;
          if (options?.maxAge) {
            cookie += `; Max-Age=${options.maxAge}`;
          }
          document.cookie = cookie;
        },
        remove(name: string, options?: { path?: string }) {
          if (typeof document === 'undefined') return;
          document.cookie = `${name}=; domain=${COOKIE_DOMAIN}; path=${options?.path || '/'}; Max-Age=0; SameSite=Lax; Secure`;
        },
      },
    }
  );
}
