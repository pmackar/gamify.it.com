import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const error_param = requestUrl.searchParams.get('error');
  const next = requestUrl.searchParams.get('next') || '/';

  console.log('Auth callback params:', { code: !!code, token_hash: !!token_hash, type, error: error_param });

  // Handle error from OAuth provider
  if (error_param) {
    console.error('Auth callback error:', error_param);
    return NextResponse.redirect(new URL(`/?error=${error_param}`, requestUrl.origin));
  }

  const supabase = await createClient();

  // Handle token_hash (magic link without PKCE)
  if (token_hash && type) {
    try {
      console.log('Verifying token_hash...');
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'magiclink' | 'email',
      });
      if (error) {
        console.error('Token hash verification error:', error.message);
        return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
      }
      console.log('Token hash verified successfully');
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (e) {
      console.error('Token hash exception:', e);
      return NextResponse.redirect(new URL(`/?error=auth_failed`, requestUrl.origin));
    }
  }

  // Exchange code for session (PKCE flow)
  if (code) {
    try {
      console.log('Exchanging code for session...');
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Supabase auth error:', error.message);
        return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
      }
      console.log('Code exchanged successfully');
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (e) {
      console.error('Callback exception:', e);
      return NextResponse.redirect(new URL(`/?error=auth_failed`, requestUrl.origin));
    }
  }

  // No code or token_hash provided - redirect home
  console.log('No auth params, redirecting home');
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
