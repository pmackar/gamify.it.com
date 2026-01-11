"use client";

import { useState, useEffect } from "react";

interface Subscription {
  id: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED" | "TRIALING";
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  plan: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    interval: string;
    features: string[];
  };
  coach: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function AthleteSubscriptionPanel() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch("/api/fitness/athlete/subscribe");
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setError("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (
    subscriptionId: string,
    immediately: boolean = false
  ) => {
    if (
      !confirm(
        immediately
          ? "Cancel immediately? You will lose access right away."
          : "Cancel at end of billing period?"
      )
    ) {
      return;
    }

    setActionLoading(subscriptionId);
    try {
      const res = await fetch("/api/fitness/athlete/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          subscriptionId,
          immediately,
        }),
      });

      if (res.ok) {
        fetchSubscriptions();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to cancel subscription");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      setError("Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (sub: Subscription) => {
    if (sub.cancelAtPeriodEnd) {
      return (
        <span className="px-2 py-0.5 text-xs rounded bg-yellow-900/50 text-yellow-400 border border-yellow-500/30">
          Cancelling
        </span>
      );
    }

    switch (sub.status) {
      case "ACTIVE":
        return (
          <span className="px-2 py-0.5 text-xs rounded bg-green-900/50 text-green-400 border border-green-500/30">
            Active
          </span>
        );
      case "TRIALING":
        return (
          <span className="px-2 py-0.5 text-xs rounded bg-blue-900/50 text-blue-400 border border-blue-500/30">
            Trial
          </span>
        );
      case "PAST_DUE":
        return (
          <span className="px-2 py-0.5 text-xs rounded bg-red-900/50 text-red-400 border border-red-500/30">
            Past Due
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-400">
            Cancelled
          </span>
        );
      case "PAUSED":
        return (
          <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-400">
            Paused
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="rpg-panel p-6">
        <div className="text-center text-yellow-400/60">
          Loading subscriptions...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rpg-panel border-red-500/50 bg-red-900/20 p-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-400/60 hover:text-red-400 mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rpg-panel p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">
          My Coaching Subscriptions
        </h2>

        {subscriptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-yellow-400/60 mb-2">No active subscriptions</p>
            <p className="text-sm text-yellow-400/40">
              Subscribe to a coach&apos;s plan to get personalized training
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className={`p-4 border rounded-lg ${
                  sub.status === "CANCELLED"
                    ? "border-gray-500/30 bg-gray-900/20 opacity-60"
                    : "border-yellow-500/30 bg-black/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {sub.coach.avatar ? (
                      <img
                        src={sub.coach.avatar}
                        alt={sub.coach.name}
                        className="w-12 h-12 rounded-full border border-yellow-500/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-yellow-900/30 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold">
                        {sub.coach.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-yellow-400">
                          {sub.coach.name}
                        </h3>
                        {getStatusBadge(sub)}
                      </div>
                      <p className="text-sm text-yellow-400/60">
                        {sub.plan.name} •{" "}
                        {formatPrice(sub.plan.priceCents, sub.plan.currency)}/
                        {sub.plan.interval}
                      </p>
                    </div>
                  </div>
                </div>

                {sub.plan.features.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/20">
                    <ul className="grid grid-cols-2 gap-1">
                      {sub.plan.features.slice(0, 4).map((feature, i) => (
                        <li
                          key={i}
                          className="text-sm text-yellow-400/70 flex items-center gap-2"
                        >
                          <span className="text-green-400">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center justify-between">
                  <div className="text-sm text-yellow-400/60">
                    {sub.status === "TRIALING" && sub.trialEnd && (
                      <span>Trial ends {formatDate(sub.trialEnd)}</span>
                    )}
                    {sub.status === "ACTIVE" && sub.currentPeriodEnd && (
                      <span>
                        {sub.cancelAtPeriodEnd
                          ? `Ends ${formatDate(sub.currentPeriodEnd)}`
                          : `Renews ${formatDate(sub.currentPeriodEnd)}`}
                      </span>
                    )}
                    {sub.status === "PAST_DUE" && (
                      <span className="text-red-400">Payment failed</span>
                    )}
                  </div>

                  {sub.status !== "CANCELLED" && !sub.cancelAtPeriodEnd && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => cancelSubscription(sub.id, false)}
                        disabled={actionLoading === sub.id}
                        className="text-sm text-yellow-400/60 hover:text-yellow-400 px-3 py-1 border border-yellow-500/30 rounded hover:bg-yellow-900/20"
                      >
                        {actionLoading === sub.id
                          ? "..."
                          : "Cancel at Period End"}
                      </button>
                    </div>
                  )}

                  {sub.cancelAtPeriodEnd && sub.status !== "CANCELLED" && (
                    <span className="text-sm text-yellow-400/40">
                      Cancellation scheduled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
