"use client";

import { useEffect } from "react";

export default function FitnessError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fitness app error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">Workout Interrupted</div>
      <h1 className="text-xl font-bold mb-4 text-emerald-400">
        Something went wrong
      </h1>
      <p className="text-gray-400 mb-6 max-w-md">
        We encountered an error. Your workout data is safe.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/fitness"
          className="px-5 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Back to Fitness
        </a>
      </div>
    </div>
  );
}
