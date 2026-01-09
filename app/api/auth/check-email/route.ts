import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Check if an email exists and what auth providers the user has.
 * This helps guide users who signed up with SSO to use their original login method
 * instead of magic link (which won't work for SSO-only accounts).
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Try admin client first (if service role key is configured)
    const adminClient = createAdminClient();

    if (adminClient) {
      // Use admin API to list users by email
      const { data, error } = await adminClient.auth.admin.listUsers();

      if (!error && data?.users) {
        const user = data.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );

        if (!user) {
          // User doesn't exist - magic link will create new account
          return NextResponse.json({
            exists: false,
            canUseMagicLink: true,
            providers: [],
          });
        }

        // Extract identity providers
        const providers = user.identities?.map((i) => i.provider) || [];
        const hasEmailProvider = providers.includes('email');
        const hasOAuthProvider = providers.some((p) =>
          ['google', 'github', 'apple', 'facebook', 'twitter'].includes(p)
        );

        // User can use magic link if:
        // 1. They have an 'email' identity (password/magic link user)
        // 2. OR they don't have any OAuth providers (legacy user)
        // They CANNOT use magic link effectively if they ONLY have OAuth identity
        const canUseMagicLink = hasEmailProvider || !hasOAuthProvider;

        // Get the primary OAuth provider for display purposes
        const oauthProviders = providers.filter((p) => p !== 'email');

        return NextResponse.json({
          exists: true,
          canUseMagicLink,
          providers: oauthProviders,
          hasEmailProvider,
        });
      }
    }

    // Fallback: Check profiles table (works without admin key)
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (!profile) {
      // User doesn't exist - magic link will create new account
      return NextResponse.json({
        exists: false,
        canUseMagicLink: true,
        providers: [],
      });
    }

    // User exists but we can't check their providers without admin access
    // Allow magic link attempt - Supabase will handle identity linking
    return NextResponse.json({
      exists: true,
      canUseMagicLink: true, // Allow attempt, might fail if SSO-only
      providers: [],
      note: 'Unable to verify providers - service role key not configured',
    });
  } catch (error) {
    console.error('Check email error:', error);
    // On error, allow magic link attempt (fail open for better UX)
    return NextResponse.json({
      exists: false,
      canUseMagicLink: true,
      providers: [],
    });
  }
}
