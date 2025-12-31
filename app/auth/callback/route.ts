import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error_param = requestUrl.searchParams.get('error');
  const next = requestUrl.searchParams.get('next') || '/';
  const isPopup = !requestUrl.searchParams.has('next');

  if (error_param) {
    if (isPopup) {
      return new NextResponse(`<!DOCTYPE html><html><body><script>window.close();</script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
    }
    return NextResponse.redirect(new URL(`/login?error=${error_param}`, requestUrl.origin));
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Supabase auth error:', error.message, error);
        if (isPopup) {
          return new NextResponse(`<!DOCTYPE html><html><body><script>window.close();</script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
        }
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
      }
      if (isPopup) {
        return new NextResponse(`<!DOCTYPE html><html><body><script>window.close();</script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
      }
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (e) {
      console.error('Callback exception:', e);
      if (isPopup) {
        return new NextResponse(`<!DOCTYPE html><html><body><script>window.close();</script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
      }
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(String(e))}`, requestUrl.origin));
    }
  }

  if (isPopup) {
    return new NextResponse(`<!DOCTYPE html><html><body><script>window.close();</script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
}
