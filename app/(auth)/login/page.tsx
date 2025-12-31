"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Compass, MapPin, Trophy, Globe } from "lucide-react";
import { Suspense, useState } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #87ceeb 0%, #5cc9f5 30%, #7fd954 70%, #5cb33c 100%)' }}>
      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(20px)', border: '2px solid rgba(255, 255, 255, 0.4)' }}>
            <Compass className="w-10 h-10" style={{ color: '#1a365d' }} />
          </div>
          <h1 className="pixel-font text-2xl mb-2" style={{ color: '#1a365d', textShadow: '3px 3px 0 rgba(255, 255, 255, 0.5)' }}>
            gamify.travel
          </h1>
          <p style={{ color: '#1a365d', fontSize: '1.1rem' }}>
            Turn your travels into an adventure
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: '#1a365d' }}>
            Welcome back, explorer!
          </h2>

          {error && (
            <div className="mb-6 p-4 rounded-lg text-sm" style={{ background: 'rgba(255, 107, 107, 0.2)', border: '1px solid rgba(255, 107, 107, 0.4)', color: '#cc0000' }}>
              {error === "OAuthAccountNotLinked" && "This email is already associated with another account."}
              {error === "AccessDenied" && "Access was denied."}
              {error === "Configuration" && "Server configuration error."}
              {!["OAuthAccountNotLinked", "AccessDenied", "Configuration"].includes(error) && "An error occurred during sign in."}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 font-medium rounded-xl transition-all"
            style={{
              background: 'white',
              color: '#1a365d',
              border: '2px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="mt-6 text-center text-sm" style={{ color: 'rgba(26, 54, 93, 0.7)' }}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Features preview */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-2" style={{ background: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(10px)' }}>
              <MapPin className="w-6 h-6" style={{ color: '#1a365d' }} />
            </div>
            <p className="text-xs font-medium" style={{ color: '#1a365d' }}>Track Locations</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-2" style={{ background: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(10px)' }}>
              <Trophy className="w-6 h-6" style={{ color: '#FFD93D' }} />
            </div>
            <p className="text-xs font-medium" style={{ color: '#1a365d' }}>Earn XP</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-2" style={{ background: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(10px)' }}>
              <Globe className="w-6 h-6" style={{ color: '#7fd954' }} />
            </div>
            <p className="text-xs font-medium" style={{ color: '#1a365d' }}>Explore</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #87ceeb 0%, #5cc9f5 100%)' }}>
        <div className="animate-pulse" style={{ color: '#1a365d' }}>Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
