"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body className="bg-gray-900 text-white">
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
          <div className="text-6xl mb-6">Critical Error</div>
          <h1 className="text-2xl font-bold mb-4">Something went seriously wrong</h1>
          <p className="text-gray-400 mb-8 max-w-md text-center">
            The application encountered a critical error. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
