"use client";

import { useState } from "react";

interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  interval: string;
  trialDays?: number;
  features: string[];
  maxAthletes?: number;
  spotsRemaining?: number;
}

interface CoachPricingDisplayProps {
  coachId: string;
  coachName: string;
  plans: PricingPlan[];
  onSubscribe?: (planId: string) => void;
  isAuthenticated?: boolean;
}

export default function CoachPricingDisplay({
  coachName,
  plans,
  onSubscribe,
  isAuthenticated = true,
}: CoachPricingDisplayProps) {
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      window.location.href = "/api/auth/login";
      return;
    }

    if (onSubscribe) {
      onSubscribe(planId);
      return;
    }

    setSubscribing(planId);
    setError(null);

    try {
      const res = await fetch("/api/fitness/athlete/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || "Failed to start subscription");
      }
    } catch (err) {
      console.error("Subscribe error:", err);
      setError("Failed to process subscription");
    } finally {
      setSubscribing(null);
    }
  };

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-yellow-400">
          Train with {coachName}
        </h2>
        <p className="text-yellow-400/60 mt-2">
          Choose a plan that fits your goals
        </p>
      </div>

      {error && (
        <div className="rpg-panel border-red-500/50 bg-red-900/20 p-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div
        className={`grid gap-6 ${
          plans.length === 1
            ? "max-w-md mx-auto"
            : plans.length === 2
            ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {plans.map((plan, index) => {
          const isPopular = plans.length > 1 && index === 1;
          const isSoldOut =
            plan.maxAthletes !== undefined && plan.spotsRemaining === 0;

          return (
            <div
              key={plan.id}
              className={`relative rpg-panel p-6 ${
                isPopular ? "border-yellow-400 scale-105" : ""
              } ${isSoldOut ? "opacity-60" : ""}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-bold bg-yellow-400 text-black rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-yellow-400">
                  {plan.name}
                </h3>
                {plan.description && (
                  <p className="text-sm text-yellow-400/60 mt-2">
                    {plan.description}
                  </p>
                )}
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-yellow-400">
                  {formatPrice(plan.priceCents, plan.currency)}
                </div>
                <div className="text-yellow-400/60">per {plan.interval}</div>
                {plan.trialDays && plan.trialDays > 0 && (
                  <div className="mt-2 text-sm text-green-400">
                    {plan.trialDays}-day free trial
                  </div>
                )}
              </div>

              {plan.features.length > 0 && (
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-yellow-400/80"
                    >
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}

              {plan.maxAthletes && (
                <div className="text-center text-sm text-yellow-400/60 mb-4">
                  {isSoldOut ? (
                    <span className="text-red-400">Sold out</span>
                  ) : plan.spotsRemaining !== undefined ? (
                    <span>
                      Only{" "}
                      <span className="text-yellow-400 font-medium">
                        {plan.spotsRemaining}
                      </span>{" "}
                      spot{plan.spotsRemaining !== 1 ? "s" : ""} left
                    </span>
                  ) : (
                    <span>Limited to {plan.maxAthletes} athletes</span>
                  )}
                </div>
              )}

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscribing === plan.id || isSoldOut}
                className={`w-full py-3 rounded-lg font-bold transition-all ${
                  isSoldOut
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : isPopular
                    ? "bg-yellow-400 text-black hover:bg-yellow-300"
                    : "rpg-button"
                }`}
              >
                {subscribing === plan.id
                  ? "Processing..."
                  : isSoldOut
                  ? "Sold Out"
                  : plan.trialDays
                  ? "Start Free Trial"
                  : "Subscribe Now"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-yellow-400/40">
        Secure payment via Stripe. Cancel anytime.
      </p>
    </div>
  );
}
