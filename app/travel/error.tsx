"use client";

import { useEffect } from "react";

export default function TravelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Travel app error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">Travel Error</div>
      <h1 className="text-xl font-bold mb-4 text-amber-400">
        Something went wrong exploring
      </h1>
      <p className="text-gray-400 mb-6 max-w-md">
        We encountered an error loading this page. Your data is safe.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/travel"
          className="px-5 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Back to Travel
        </a>
      </div>
    </div>
  );
}
