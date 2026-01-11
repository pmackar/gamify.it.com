"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CoachBillingPanel from "@/components/fitness/CoachBillingPanel";

export default function CoachBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    checkCoachStatus();
  }, []);

  const checkCoachStatus = async () => {
    try {
      const res = await fetch("/api/fitness/coach/profile");
      if (res.ok) {
        setIsCoach(true);
      } else if (res.status === 404) {
        router.push("/fitness/coach");
      } else if (res.status === 401) {
        router.push("/api/auth/login");
      }
    } catch (error) {
      console.error("Error checking coach status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-yellow-400/60">Loading...</div>
      </div>
    );
  }

  if (!isCoach) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/fitness/coach"
            className="inline-flex items-center gap-2 text-yellow-400/60 hover:text-yellow-400 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-yellow-400">Billing</h1>
          <p className="text-yellow-400/60 mt-2">
            Manage your Stripe account and pricing plans
          </p>
        </div>

        <CoachBillingPanel />
      </div>
    </div>
  );
}
