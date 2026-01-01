import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error_param = requestUrl.searchParams.get('error');
  const next = requestUrl.searchParams.get('next') || '/';

  // Handle error from OAuth provider
  if (error_param) {
    console.error('Auth callback error:', error_param);
    return NextResponse.redirect(new URL(`/?error=${error_param}`, requestUrl.origin));
  }

  // Exchange code for session (magic links use PKCE flow)
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Supabase auth error:', error.message);
        return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
      }
      // Success! Redirect to home or next page
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (e) {
      console.error('Callback exception:', e);
      return NextResponse.redirect(new URL(`/?error=auth_failed`, requestUrl.origin));
    }
  }

  // No code provided - redirect home
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
