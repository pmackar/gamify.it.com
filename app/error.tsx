"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-8">
      <div className="text-6xl mb-6">Oops!</div>
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-gray-400 mb-8 max-w-md text-center">
        An unexpected error occurred. Our team has been notified.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
        >
          Try Again
        </button>
        <a
          href="/"
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          Go Home
        </a>
      </div>
      {process.env.NODE_ENV === "development" && error.message && (
        <pre className="mt-8 p-4 bg-gray-800 rounded-lg text-sm text-red-400 max-w-2xl overflow-auto">
          {error.message}
        </pre>
      )}
    </div>
  );
}
