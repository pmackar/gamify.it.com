# Google OAuth Setup Guide

> Time: ~15 minutes
> Required: Google account, Supabase dashboard access

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown (top left) → **New Project**
3. Name: `gamify-it-com` (or similar)
4. Click **Create**
5. Select the new project from the dropdown

---

## Step 2: Enable Google+ API

1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click **Google+ API** → **Enable**

---

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** → **Create**
3. Fill in the form:

| Field | Value |
|-------|-------|
| App name | gamify.it.com |
| User support email | your-email@gmail.com |
| App logo | (optional) Upload your logo |
| App domain | gamify.it.com |
| Authorized domains | gamify.it.com |
| Developer contact | your-email@gmail.com |

4. Click **Save and Continue**

### Scopes
1. Click **Add or Remove Scopes**
2. Select these scopes:
   - `email`
   - `profile`
   - `openid`
3. Click **Update** → **Save and Continue**

### Test Users (Optional for development)
- Add your email for testing before publishing
- Click **Save and Continue**

### Summary
- Review and click **Back to Dashboard**

---

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Fill in:

| Field | Value |
|-------|-------|
| Name | gamify.it.com Web Client |
| Authorized JavaScript origins | `https://gamify.it.com` |
| | `https://www.gamify.it.com` |
| | `http://localhost:3000` |
| Authorized redirect URIs | `https://klsxuyiwkjrkkvwwbehc.supabase.co/auth/v1/callback` |

> **Important:** The redirect URI must be your Supabase project URL + `/auth/v1/callback`

5. Click **Create**
6. **Copy the Client ID and Client Secret** - you'll need these next

---

## Step 5: Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`klsxuyiwkjrkkvwwbehc`)
3. Go to **Authentication** → **Providers**
4. Find **Google** and click to expand
5. Toggle **Enable Sign in with Google** ON
6. Paste your credentials:

| Field | Value |
|-------|-------|
| Client ID | (from Google Cloud Console) |
| Client Secret | (from Google Cloud Console) |

7. Click **Save**

---

## Step 6: Add Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://gamify.it.com/auth/callback
   https://www.gamify.it.com/auth/callback
   http://localhost:3000/auth/callback
   ```
3. Click **Save**

---

## Step 7: Test the Integration

1. Go to your app: `https://gamify.it.com/login`
2. Click **Continue with Google**
3. You should see Google's sign-in popup
4. After signing in, you should be redirected back to your app

---

## Troubleshooting

### "redirect_uri_mismatch" Error
- Double-check the redirect URI in Google Cloud Console
- Must be exactly: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
- No trailing slash

### "Access blocked: This app's request is invalid"
- OAuth consent screen not properly configured
- Go back to OAuth consent screen and verify all fields

### "Sign in with Google temporarily disabled"
- App not published yet (still in testing mode)
- Add your email as a test user, or publish the app

### User gets signed in but redirected to wrong page
- Check the `redirectTo` URL in the code
- Verify Supabase Redirect URLs include your callback

---

## Publishing (When Ready for Production)

1. Go to **OAuth consent screen**
2. Click **Publish App**
3. Confirm publishing
4. Google may require verification for sensitive scopes (not needed for basic email/profile)

---

## Security Notes

- Never commit Client Secret to git
- Keep credentials in environment variables
- Client ID is safe to expose (it's in the browser anyway)
- Rotate secrets if compromised

---

## Apple Sign-In Setup (For iOS App)

Apple Sign-In requires:
1. Apple Developer Account ($99/year)
2. Create App ID with Sign in with Apple capability
3. Create Services ID for web auth
4. Configure in Supabase similar to Google

See: [Supabase Apple Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)
