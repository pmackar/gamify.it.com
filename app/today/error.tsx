"use client";

import { useEffect } from "react";

export default function TodayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Today app error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">Day Interrupted</div>
      <h1 className="text-xl font-bold mb-4 text-blue-400">
        Something went wrong
      </h1>
      <p className="text-gray-400 mb-6 max-w-md">
        We encountered an error loading your daily view. Your data is safe.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/today"
          className="px-5 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Back to Today
        </a>
      </div>
    </div>
  );
}
