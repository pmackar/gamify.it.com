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
  const [step, setStep] = useState<"email" | "sent" | "code">("email");
  const [formError, setFormError] = useState("");

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
