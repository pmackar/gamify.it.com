"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full rpg-panel p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-900/50 border-2 border-yellow-500 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-yellow-400" />
        </div>

        <h1 className="text-2xl font-bold text-yellow-400 mb-4">
          Payment Cancelled
        </h1>

        <p className="text-yellow-400/80 mb-6">
          Your subscription was not completed. No charges were made.
          You can try again anytime.
        </p>

        <div className="space-y-3">
          <Link
            href="/fitness"
            className="block w-full rpg-button py-3 text-center"
          >
            Back to Fitness
          </Link>
        </div>
      </div>
    </div>
  );
}
