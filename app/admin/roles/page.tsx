"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Loader2,
  Crown,
  Gem,
  Star,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface AppFeature {
  id: string;
  app_id: string;
  feature_key: string;
  name: string;
  description: string | null;
  min_tier: "FREE" | "PREMIUM" | "COACH" | "PRO";
  created_at: string;
}

interface RolesData {
  features: AppFeature[];
  featuresByApp: Record<string, AppFeature[]>;
  subscriptionCounts: Record<string, Record<string, number>>;
  tiers: string[];
  apps: string[];
}

const TIER_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  FREE: { color: "#9CA3AF", bg: "rgba(156, 163, 175, 0.2)", icon: <Star size={14} />, label: "Free" },
  PREMIUM: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.2)", icon: <Crown size={14} />, label: "Premium" },
  COACH: { color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.2)", icon: <Gem size={14} />, label: "Coach" },
  PRO: { color: "#06B6D4", bg: "rgba(6, 182, 212, 0.2)", icon: <Zap size={14} />, label: "Pro" },
};

const APP_LABELS: Record<string, string> = {
  global: "Global Platform",
  fitness: "Iron Quest (Fitness)",
  today: "Day Quest (Today)",
  travel: "Explorer (Travel)",
};

export default function RolesPage() {
  const [data, setData] = useState<RolesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set(["global", "fitness", "today", "travel"]));
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeature, setNewFeature] = useState({
    app_id: "global",
    feature_key: "",
    name: "",
    description: "",
    min_tier: "FREE" as "FREE" | "PREMIUM" | "COACH" | "PRO",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch roles data:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleApp(appId: string) {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  }

  async function updateFeature(featureId: string, updates: Partial<AppFeature>) {
    setSavingFeature(featureId);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: featureId, ...updates }),
      });

      if (res.ok) {
        await fetchData();
        setEditingFeature(null);
      } else {
        const json = await res.json();
        alert(json.error || "Failed to update feature");
      }
    } catch (error) {
      console.error("Failed to update feature:", error);
      alert("Failed to update feature");
    } finally {
      setSavingFeature(null);
    }
  }

  async function deleteFeature(featureId: string) {
    if (!confirm("Are you sure you want to delete this feature?")) return;

    try {
      const res = await fetch(`/api/admin/roles?id=${featureId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchData();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to delete feature");
      }
    } catch (error) {
      console.error("Failed to delete feature:", error);
      alert("Failed to delete feature");
    }
  }

  async function createFeature() {
    if (!newFeature.feature_key || !newFeature.name) {
      alert("Feature key and name are required");
      return;
    }

    setSavingFeature("new");
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFeature),
      });

      if (res.ok) {
        await fetchData();
        setShowAddForm(false);
        setNewFeature({
          app_id: "global",
          feature_key: "",
          name: "",
          description: "",
          min_tier: "FREE",
        });
      } else {
        const json = await res.json();
        alert(json.error || "Failed to create feature");
      }
    } catch (error) {
      console.error("Failed to create feature:", error);
      alert("Failed to create feature");
    } finally {
      setSavingFeature(null);
    }
  }

  function getTierBadge(tier: string) {
    const config = TIER_CONFIG[tier] || TIER_CONFIG.FREE;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
        style={{ background: config.bg, color: config.color }}
      >
        {config.icon}
        {config.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={24} style={{ color: "var(--rpg-teal)" }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8" style={{ color: "var(--rpg-muted)" }}>
        Failed to load data
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-xl"
          style={{
            fontFamily: "var(--font-pixel)",
            color: "var(--rpg-teal)",
            fontSize: "14px",
          }}
        >
          Roles & Permissions
        </h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            background: "var(--rpg-teal)",
            color: "var(--rpg-bg-dark)",
          }}
        >
          <Plus size={16} />
          Add Feature
        </button>
      </div>

      {/* Subscription Tiers Overview */}
      <div
        className="p-4 rounded-lg mb-6"
        style={{
          background: "var(--rpg-card)",
          border: "1px solid var(--rpg-border)",
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--rpg-text)" }}>
          Subscription Tiers
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {["FREE", "PREMIUM", "COACH", "PRO"].map((tier) => {
            const config = TIER_CONFIG[tier];
            const totalSubs = Object.values(data.subscriptionCounts[tier] || {}).reduce(
              (a, b) => a + b,
              0
            );
            return (
              <div
                key={tier}
                className="p-4 rounded-lg text-center"
                style={{
                  background: config.bg,
                  border: `1px solid ${config.color}40`,
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2" style={{ color: config.color }}>
                  {config.icon}
                  <span className="font-semibold">{config.label}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--rpg-text)" }}>
                  {totalSubs}
                </p>
                <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                  subscriptions
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Feature Form */}
      {showAddForm && (
        <div
          className="p-4 rounded-lg mb-6"
          style={{
            background: "var(--rpg-card)",
            border: "1px solid var(--rpg-teal)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--rpg-text)" }}>
              Add New Feature
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded hover:bg-white/10"
              style={{ color: "var(--rpg-muted)" }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                App
              </label>
              <select
                value={newFeature.app_id}
                onChange={(e) => setNewFeature({ ...newFeature, app_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--rpg-darker)",
                  border: "1px solid var(--rpg-border)",
                  color: "var(--rpg-text)",
                }}
              >
                <option value="global">Global Platform</option>
                <option value="fitness">Iron Quest (Fitness)</option>
                <option value="today">Day Quest (Today)</option>
                <option value="travel">Explorer (Travel)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                Min Tier Required
              </label>
              <select
                value={newFeature.min_tier}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, min_tier: e.target.value as any })
                }
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--rpg-darker)",
                  border: "1px solid var(--rpg-border)",
                  color: "var(--rpg-text)",
                }}
              >
                <option value="FREE">Free</option>
                <option value="PREMIUM">Premium</option>
                <option value="COACH">Coach</option>
                <option value="PRO">Pro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                Feature Key (snake_case)
              </label>
              <input
                type="text"
                value={newFeature.feature_key}
                onChange={(e) => setNewFeature({ ...newFeature, feature_key: e.target.value })}
                placeholder="e.g., unlimited_workouts"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--rpg-darker)",
                  border: "1px solid var(--rpg-border)",
                  color: "var(--rpg-text)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                Display Name
              </label>
              <input
                type="text"
                value={newFeature.name}
                onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                placeholder="e.g., Unlimited Workouts"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--rpg-darker)",
                  border: "1px solid var(--rpg-border)",
                  color: "var(--rpg-text)",
                }}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                Description (optional)
              </label>
              <input
                type="text"
                value={newFeature.description}
                onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                placeholder="Brief description of this feature"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--rpg-darker)",
                  border: "1px solid var(--rpg-border)",
                  color: "var(--rpg-text)",
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--rpg-muted)" }}
            >
              Cancel
            </button>
            <button
              onClick={createFeature}
              disabled={savingFeature === "new"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm"
              style={{
                background: "var(--rpg-teal)",
                color: "var(--rpg-bg-dark)",
              }}
            >
              {savingFeature === "new" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Create Feature
            </button>
          </div>
        </div>
      )}

      {/* Features by App */}
      <div className="space-y-4">
        {["global", "fitness", "today", "travel"].map((appId) => {
          const features = data.featuresByApp[appId] || [];
          const isExpanded = expandedApps.has(appId);

          return (
            <div
              key={appId}
              className="rounded-lg overflow-hidden"
              style={{
                background: "var(--rpg-card)",
                border: "1px solid var(--rpg-border)",
              }}
            >
              {/* App Header */}
              <button
                onClick={() => toggleApp(appId)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown size={16} style={{ color: "var(--rpg-muted)" }} />
                  ) : (
                    <ChevronRight size={16} style={{ color: "var(--rpg-muted)" }} />
                  )}
                  <h3 className="font-semibold" style={{ color: "var(--rpg-text)" }}>
                    {APP_LABELS[appId] || appId}
                  </h3>
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      background: "var(--rpg-border)",
                      color: "var(--rpg-muted)",
                    }}
                  >
                    {features.length} features
                  </span>
                </div>
              </button>

              {/* Features Table */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--rpg-border)" }}>
                  {features.length === 0 ? (
                    <div className="p-4 text-center text-sm" style={{ color: "var(--rpg-muted)" }}>
                      No features defined for this app
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--rpg-border)" }}>
                          <th
                            className="text-left p-3 text-xs font-medium"
                            style={{ color: "var(--rpg-muted)" }}
                          >
                            Feature Key
                          </th>
                          <th
                            className="text-left p-3 text-xs font-medium"
                            style={{ color: "var(--rpg-muted)" }}
                          >
                            Name
                          </th>
                          <th
                            className="text-left p-3 text-xs font-medium"
                            style={{ color: "var(--rpg-muted)" }}
                          >
                            Description
                          </th>
                          <th
                            className="text-left p-3 text-xs font-medium"
                            style={{ color: "var(--rpg-muted)" }}
                          >
                            Min Tier
                          </th>
                          <th className="p-3 w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.map((feature) => (
                          <FeatureRow
                            key={feature.id}
                            feature={feature}
                            isEditing={editingFeature === feature.id}
                            isSaving={savingFeature === feature.id}
                            onEdit={() => setEditingFeature(feature.id)}
                            onCancel={() => setEditingFeature(null)}
                            onSave={(updates) => updateFeature(feature.id, updates)}
                            onDelete={() => deleteFeature(feature.id)}
                            getTierBadge={getTierBadge}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FeatureRowProps {
  feature: AppFeature;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<AppFeature>) => void;
  onDelete: () => void;
  getTierBadge: (tier: string) => React.ReactNode;
}

function FeatureRow({
  feature,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  getTierBadge,
}: FeatureRowProps) {
  const [editValues, setEditValues] = useState({
    name: feature.name,
    description: feature.description || "",
    min_tier: feature.min_tier,
  });

  useEffect(() => {
    if (isEditing) {
      setEditValues({
        name: feature.name,
        description: feature.description || "",
        min_tier: feature.min_tier,
      });
    }
  }, [isEditing, feature]);

  if (isEditing) {
    return (
      <tr style={{ borderBottom: "1px solid var(--rpg-border)" }} className="bg-white/5">
        <td className="p-3">
          <code className="text-xs" style={{ color: "var(--rpg-teal)" }}>
            {feature.feature_key}
          </code>
        </td>
        <td className="p-3">
          <input
            type="text"
            value={editValues.name}
            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
            className="w-full px-2 py-1 rounded text-sm"
            style={{
              background: "var(--rpg-darker)",
              border: "1px solid var(--rpg-border)",
              color: "var(--rpg-text)",
            }}
          />
        </td>
        <td className="p-3">
          <input
            type="text"
            value={editValues.description}
            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
            className="w-full px-2 py-1 rounded text-sm"
            style={{
              background: "var(--rpg-darker)",
              border: "1px solid var(--rpg-border)",
              color: "var(--rpg-text)",
            }}
          />
        </td>
        <td className="p-3">
          <select
            value={editValues.min_tier}
            onChange={(e) => setEditValues({ ...editValues, min_tier: e.target.value as any })}
            className="px-2 py-1 rounded text-sm"
            style={{
              background: "var(--rpg-darker)",
              border: "1px solid var(--rpg-border)",
              color: "var(--rpg-text)",
            }}
          >
            <option value="FREE">Free</option>
            <option value="PREMIUM">Premium</option>
            <option value="COACH">Coach</option>
            <option value="PRO">Pro</option>
          </select>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-1">
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--rpg-muted)" }} />
            ) : (
              <>
                <button
                  onClick={() => onSave(editValues)}
                  className="p-1.5 rounded hover:bg-white/10"
                  style={{ color: "var(--rpg-teal)" }}
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={onCancel}
                  className="p-1.5 rounded hover:bg-white/10"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      style={{ borderBottom: "1px solid var(--rpg-border)" }}
      className="hover:bg-white/5"
    >
      <td className="p-3">
        <code className="text-xs" style={{ color: "var(--rpg-teal)" }}>
          {feature.feature_key}
        </code>
      </td>
      <td className="p-3 text-sm" style={{ color: "var(--rpg-text)" }}>
        {feature.name}
      </td>
      <td className="p-3 text-sm" style={{ color: "var(--rpg-muted)" }}>
        {feature.description || "—"}
      </td>
      <td className="p-3">{getTierBadge(feature.min_tier)}</td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-white/10"
            style={{ color: "var(--rpg-muted)" }}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-white/10"
            style={{ color: "#EF4444" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
