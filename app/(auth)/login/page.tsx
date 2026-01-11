"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const [step, setStep] = useState<"email" | "sent" | "code">("email");
  const [formError, setFormError] = useState("");

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    setFormError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) {
        setFormError(error.message);
        setSocialLoading(null);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to connect to Google");
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading("apple");
    setFormError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
        },
      });
      if (error) {
        setFormError(error.message);
        setSocialLoading(null);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to connect to Apple");
      setSocialLoading(null);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setFormError("");
    try {
      const supabase = createClient();
      const redirectUrl = callbackUrl.startsWith("/")
        ? `${window.location.origin}${callbackUrl}`
        : callbackUrl;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) {
        setFormError(error.message);
      } else {
        setStep("sent");
      }
    } catch (err) {
      console.error("sendLink catch:", err);
      setFormError(
        `Network error: ${err instanceof Error ? err.message : "Unknown"}`
      );
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) return;
    setLoading(true);
    setFormError("");
    try {
      const res = await fetch(`/api/auth/transfer-code?code=${code}`);
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Invalid code");
        setCode("");
      } else {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });
        if (error) {
          setFormError(error.message);
        } else {
          window.location.href = callbackUrl;
        }
      }
    } catch (err) {
      console.error("verifyCode catch:", err);
      setFormError(
        `Network error: ${err instanceof Error ? err.message : "Unknown"}`
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap");
      `}</style>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
            <span style={{ fontSize: "1.5rem" }}>🎮</span>
          </div>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "1rem",
              color: "#FFD700",
              textShadow: "0 0 10px rgba(255,215,0,0.5)",
            }}
            className="mb-2"
          >
            gamify.it.com
          </h1>
          <p className="text-gray-400">
            Life's not a game... but it should be!
          </p>
        </div>

        {/* Login card */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Welcome, Player
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          {/* Social Login Buttons */}
          {step === "email" && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={socialLoading !== null || loading}
                className="w-full px-6 py-4 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl transition-colors flex items-center justify-center gap-3 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {socialLoading === "google" ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <button
                onClick={handleAppleLogin}
                disabled={socialLoading !== null || loading}
                className="w-full px-6 py-4 bg-black hover:bg-gray-900 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-3 mb-6 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {socialLoading === "apple" ? (
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                )}
                Continue with Apple
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900/50 text-gray-500">or continue with email</span>
                </div>
              </div>
            </>
          )}

          {step === "sent" ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✉️</div>
              <p
                className="text-green-400 font-medium mb-2"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.6rem" }}
              >
                Check your email!
              </p>
              <p className="text-yellow-400 text-sm mb-4 break-all">{email}</p>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Click the link in your email, then enter the 6-digit code shown on the page.
              </p>
              <button
                onClick={() => setStep("code")}
                className="w-full px-6 py-4 bg-transparent border border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400 font-medium rounded-xl transition-colors mb-4"
              >
                I have a code
              </button>
              <button
                onClick={() => {
                  setStep("email");
                  setFormError("");
                }}
                className="text-gray-500 hover:text-gray-400 text-sm"
              >
                ← Use different email
              </button>
            </div>
          ) : step === "code" ? (
            <div>
              <p className="text-gray-400 text-sm text-center mb-4">
                Enter the 6-digit code:
              </p>
              <form onSubmit={handleVerifyCode}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="w-full px-6 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white text-center text-2xl tracking-[0.5rem] font-mono focus:outline-none focus:border-yellow-500 mb-4"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
                {formError && (
                  <p className="text-red-400 text-sm text-center mb-4">
                    {formError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full px-6 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-gray-900 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                  style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.5rem" }}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </form>
              <button
                onClick={() => {
                  setStep("sent");
                  setCode("");
                  setFormError("");
                }}
                className="w-full text-gray-500 hover:text-gray-400 text-sm"
              >
                ← Back
              </button>
            </div>
          ) : (
            <div>
              <form onSubmit={handleSendLink}>
                <input
                  type="email"
                  className="w-full px-6 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 mb-4"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                {formError && (
                  <p className="text-red-400 text-sm text-center mb-4">
                    {formError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-gray-900 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.5rem" }}
                >
                  {loading ? "Sending..." : "Send Magic Link"}
                </button>
              </form>
              <button
                onClick={() => setStep("code")}
                className="w-full mt-4 px-6 py-3 bg-transparent border border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400 text-sm rounded-xl transition-colors"
              >
                I already have a code
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
