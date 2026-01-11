"use client";

import { useState, useEffect } from "react";

interface StripeStatus {
  hasStripeAccount: boolean;
  stripeAccountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
  };
  error?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays?: number;
  features: string[];
  isActive: boolean;
  maxAthletes?: number;
  activeSubscribers: number;
  createdAt: string;
}

export default function CoachBillingPanel() {
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New plan form state
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    priceCents: 4900, // $49 default
    interval: "month",
    trialDays: 7,
    features: [""],
    maxAthletes: undefined as number | undefined,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, plansRes] = await Promise.all([
        fetch("/api/fitness/coach/billing"),
        fetch("/api/fitness/coach/billing/plans"),
      ]);

      if (statusRes.ok) {
        setStripeStatus(await statusRes.json());
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Failed to fetch billing data:", err);
      setError("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/fitness/coach/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_account" }),
      });

      const data = await res.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        setError("Failed to start onboarding");
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      setError("Failed to start Stripe onboarding");
    } finally {
      setActionLoading(false);
    }
  };

  const openDashboard = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/fitness/coach/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dashboard_link" }),
      });

      const data = await res.json();
      if (data.dashboardUrl) {
        window.open(data.dashboardUrl, "_blank");
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fitness/coach/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlan.name,
          description: newPlan.description || undefined,
          priceCents: newPlan.priceCents,
          interval: newPlan.interval,
          trialDays: newPlan.trialDays || undefined,
          features: newPlan.features.filter((f) => f.trim()),
          maxAthletes: newPlan.maxAthletes || undefined,
        }),
      });

      if (res.ok) {
        setShowCreatePlan(false);
        setNewPlan({
          name: "",
          description: "",
          priceCents: 4900,
          interval: "month",
          trialDays: 7,
          features: [""],
          maxAthletes: undefined,
        });
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create plan");
      }
    } catch (err) {
      console.error("Create plan error:", err);
      setError("Failed to create pricing plan");
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="rpg-panel p-6">
        <div className="text-center text-yellow-400/60">Loading billing...</div>
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

      {/* Stripe Connect Status */}
      <div className="rpg-panel p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">
          Payment Account
        </h2>

        {!stripeStatus?.hasStripeAccount ? (
          <div className="space-y-4">
            <p className="text-yellow-400/80">
              Connect your Stripe account to start accepting payments from
              athletes. You&apos;ll receive payouts weekly.
            </p>
            <div className="flex items-center gap-2 text-sm text-yellow-400/60">
              <span>Platform fee: 10%</span>
              <span className="text-yellow-400/40">|</span>
              <span>Secure payments via Stripe</span>
            </div>
            <button
              onClick={startOnboarding}
              disabled={actionLoading}
              className="rpg-button px-6 py-3"
            >
              {actionLoading ? "Loading..." : "Connect Stripe Account"}
            </button>
          </div>
        ) : !stripeStatus.onboardingComplete ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-yellow-400">Onboarding in progress</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div
                className={`p-3 rounded border ${
                  stripeStatus.detailsSubmitted
                    ? "border-green-500/50 bg-green-900/20"
                    : "border-yellow-500/30 bg-yellow-900/10"
                }`}
              >
                <div className="text-yellow-400/60">Details</div>
                <div
                  className={
                    stripeStatus.detailsSubmitted
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {stripeStatus.detailsSubmitted ? "Submitted" : "Pending"}
                </div>
              </div>
              <div
                className={`p-3 rounded border ${
                  stripeStatus.chargesEnabled
                    ? "border-green-500/50 bg-green-900/20"
                    : "border-yellow-500/30 bg-yellow-900/10"
                }`}
              >
                <div className="text-yellow-400/60">Charges</div>
                <div
                  className={
                    stripeStatus.chargesEnabled
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {stripeStatus.chargesEnabled ? "Enabled" : "Pending"}
                </div>
              </div>
              <div
                className={`p-3 rounded border ${
                  stripeStatus.payoutsEnabled
                    ? "border-green-500/50 bg-green-900/20"
                    : "border-yellow-500/30 bg-yellow-900/10"
                }`}
              >
                <div className="text-yellow-400/60">Payouts</div>
                <div
                  className={
                    stripeStatus.payoutsEnabled
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {stripeStatus.payoutsEnabled ? "Enabled" : "Pending"}
                </div>
              </div>
            </div>
            {stripeStatus.requirements?.currently_due &&
              stripeStatus.requirements.currently_due.length > 0 && (
                <div className="text-sm text-yellow-400/60">
                  <span className="font-medium">Action required:</span>{" "}
                  {stripeStatus.requirements.currently_due.length} items pending
                </div>
              )}
            <button
              onClick={startOnboarding}
              disabled={actionLoading}
              className="rpg-button px-6 py-2"
            >
              {actionLoading ? "Loading..." : "Continue Onboarding"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-green-400">Account active</span>
            </div>
            <p className="text-yellow-400/60 text-sm">
              Your Stripe account is fully set up. You can accept payments and
              receive weekly payouts.
            </p>
            <button
              onClick={openDashboard}
              disabled={actionLoading}
              className="rpg-button-secondary px-4 py-2 text-sm"
            >
              Open Stripe Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Pricing Plans */}
      {stripeStatus?.onboardingComplete && (
        <div className="rpg-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-yellow-400">Pricing Plans</h2>
            <button
              onClick={() => setShowCreatePlan(!showCreatePlan)}
              className="rpg-button px-4 py-2 text-sm"
            >
              {showCreatePlan ? "Cancel" : "+ New Plan"}
            </button>
          </div>

          {/* Create Plan Form */}
          {showCreatePlan && (
            <form
              onSubmit={createPlan}
              className="mb-6 p-4 border border-yellow-500/30 rounded-lg bg-black/30"
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-yellow-400/60 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, name: e.target.value })
                    }
                    placeholder="e.g., Monthly Coaching"
                    className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded text-yellow-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-yellow-400/60 mb-1">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    value={newPlan.priceCents / 100}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        priceCents: Math.round(parseFloat(e.target.value) * 100),
                      })
                    }
                    min="1"
                    step="0.01"
                    className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded text-yellow-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-yellow-400/60 mb-1">
                    Billing Interval
                  </label>
                  <select
                    value={newPlan.interval}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, interval: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded text-yellow-400"
                  >
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-yellow-400/60 mb-1">
                    Trial Days
                  </label>
                  <input
                    type="number"
                    value={newPlan.trialDays || ""}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        trialDays: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    min="0"
                    max="30"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded text-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-yellow-400/60 mb-1">
                    Max Athletes
                  </label>
                  <input
                    type="number"
                    value={newPlan.maxAthletes || ""}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        maxAthletes: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    min="1"
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded text-yellow-400"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-yellow-400/60 mb-1">
                  Description
                </label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, description: e.target.value })
                  }
                  placeholder="Describe what's included..."
                  rows={2}
                  className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded text-yellow-400 resize-none"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-yellow-400/60 mb-1">
                  Features
                </label>
                {newPlan.features.map((feature, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => {
                        const updated = [...newPlan.features];
                        updated[i] = e.target.value;
                        setNewPlan({ ...newPlan, features: updated });
                      }}
                      placeholder={`Feature ${i + 1}`}
                      className="flex-1 px-3 py-2 bg-black/50 border border-yellow-500/30 rounded text-yellow-400"
                    />
                    {newPlan.features.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewPlan({
                            ...newPlan,
                            features: newPlan.features.filter(
                              (_, idx) => idx !== i
                            ),
                          });
                        }}
                        className="px-3 py-2 text-red-400 hover:bg-red-900/30 rounded"
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setNewPlan({
                      ...newPlan,
                      features: [...newPlan.features, ""],
                    })
                  }
                  className="text-sm text-yellow-400/60 hover:text-yellow-400"
                >
                  + Add feature
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreatePlan(false)}
                  className="px-4 py-2 text-yellow-400/60 hover:text-yellow-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newPlan.name}
                  className="rpg-button px-6 py-2"
                >
                  {actionLoading ? "Creating..." : "Create Plan"}
                </button>
              </div>
            </form>
          )}

          {/* Plans List */}
          {plans.length === 0 ? (
            <p className="text-yellow-400/60 text-center py-8">
              No pricing plans yet. Create one to start accepting subscribers.
            </p>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-4 border rounded-lg ${
                    plan.isActive
                      ? "border-yellow-500/30 bg-black/30"
                      : "border-gray-500/30 bg-gray-900/20 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-yellow-400">
                          {plan.name}
                        </h3>
                        {!plan.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-sm text-yellow-400/60 mt-1">
                          {plan.description}
                        </p>
                      )}
                      {plan.features.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {plan.features.map((feature, i) => (
                            <li
                              key={i}
                              className="text-sm text-yellow-400/70 flex items-center gap-2"
                            >
                              <span className="text-green-400">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-400">
                        {formatPrice(plan.priceCents, plan.currency)}
                      </div>
                      <div className="text-sm text-yellow-400/60">
                        per {plan.interval}
                        {plan.intervalCount > 1 ? ` (${plan.intervalCount})` : ""}
                      </div>
                      {plan.trialDays && (
                        <div className="text-xs text-green-400 mt-1">
                          {plan.trialDays}-day free trial
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center justify-between text-sm">
                    <div className="text-yellow-400/60">
                      <span className="text-yellow-400 font-medium">
                        {plan.activeSubscribers}
                      </span>{" "}
                      active subscriber{plan.activeSubscribers !== 1 ? "s" : ""}
                      {plan.maxAthletes && (
                        <span className="text-yellow-400/40">
                          {" "}
                          / {plan.maxAthletes} max
                        </span>
                      )}
                    </div>
                    <div className="text-yellow-400/40">
                      Created {new Date(plan.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revenue Summary Placeholder */}
      {stripeStatus?.onboardingComplete && plans.length > 0 && (
        <div className="rpg-panel p-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">
            Revenue Overview
          </h2>
          <p className="text-yellow-400/60 text-sm">
            View detailed revenue analytics in your{" "}
            <button
              onClick={openDashboard}
              className="text-yellow-400 underline hover:no-underline"
            >
              Stripe Dashboard
            </button>
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-4 border border-yellow-500/20 rounded-lg bg-black/30">
              <div className="text-yellow-400/60 text-sm">
                Total Subscribers
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                {plans.reduce((sum, p) => sum + p.activeSubscribers, 0)}
              </div>
            </div>
            <div className="p-4 border border-yellow-500/20 rounded-lg bg-black/30">
              <div className="text-yellow-400/60 text-sm">Active Plans</div>
              <div className="text-2xl font-bold text-yellow-400">
                {plans.filter((p) => p.isActive).length}
              </div>
            </div>
            <div className="p-4 border border-yellow-500/20 rounded-lg bg-black/30">
              <div className="text-yellow-400/60 text-sm">Platform Fee</div>
              <div className="text-2xl font-bold text-yellow-400">10%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
