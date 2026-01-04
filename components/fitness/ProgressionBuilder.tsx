"use client";

import React, { useState, useEffect } from "react";
import {
  ProgressionConfig,
  ProgressionType,
  LinearProgression,
  DoubleProgression,
  RpeProgression,
  PercentageProgression,
  WaveProgression,
} from "@/lib/fitness/types";

interface ProgressionBuilderProps {
  value: ProgressionConfig | null;
  onChange: (config: ProgressionConfig) => void;
  exerciseName?: string; // If set, this is exercise-specific
}

const PROGRESSION_TYPES: { type: ProgressionType; label: string; description: string }[] = [
  { type: "none", label: "No Progression", description: "Keep weights and reps static" },
  { type: "linear", label: "Linear Progression", description: "Add weight after each successful session" },
  { type: "double_progression", label: "Double Progression", description: "Increase reps until top of range, then add weight" },
  { type: "rpe_based", label: "RPE-Based", description: "Adjust weight based on perceived exertion" },
  { type: "percentage", label: "Percentage Increase", description: "Increase weight by fixed % each week" },
  { type: "wave", label: "Wave Loading", description: "Cycle through intensity/volume waves" },
];

const DEFAULT_CONFIGS: Record<ProgressionType, ProgressionConfig> = {
  none: { type: "none" },
  linear: {
    type: "linear",
    weightIncrement: 5,
    deloadThreshold: 3,
    deloadPercent: 0.1,
  },
  double_progression: {
    type: "double_progression",
    repRange: [8, 12],
    weightIncrement: 5,
  },
  rpe_based: {
    type: "rpe_based",
    targetRpe: 8,
    rpeRange: [7, 9],
    adjustmentPerPoint: 5,
  },
  percentage: {
    type: "percentage",
    weeklyIncrease: 0.025,
    basedOn: "working_weight",
  },
  wave: {
    type: "wave",
    waves: [
      { week: 1, intensityPercent: 70, sets: 4, reps: 10 },
      { week: 2, intensityPercent: 75, sets: 4, reps: 8 },
      { week: 3, intensityPercent: 80, sets: 4, reps: 6 },
      { week: 4, intensityPercent: 60, sets: 3, reps: 12 },
    ],
  },
};

export default function ProgressionBuilder({
  value,
  onChange,
  exerciseName,
}: ProgressionBuilderProps) {
  const [selectedType, setSelectedType] = useState<ProgressionType>(
    value?.type || "none"
  );
  const [config, setConfig] = useState<ProgressionConfig>(
    value || DEFAULT_CONFIGS.none
  );

  useEffect(() => {
    if (value) {
      setSelectedType(value.type);
      setConfig(value);
    }
  }, [value]);

  const handleTypeChange = (type: ProgressionType) => {
    setSelectedType(type);
    const newConfig = DEFAULT_CONFIGS[type];
    setConfig(newConfig);
    onChange(newConfig);
  };

  const updateConfig = (updates: Partial<ProgressionConfig>) => {
    const newConfig = { ...config, ...updates } as ProgressionConfig;
    setConfig(newConfig);
    onChange(newConfig);
  };

  // Generate preview based on starting weight
  const generatePreview = (startWeight: number = 100) => {
    const weeks = [];
    let weight = startWeight;
    let reps = config.type === "double_progression" ? (config as DoubleProgression).repRange[0] : 8;

    for (let week = 1; week <= 4; week++) {
      switch (config.type) {
        case "linear": {
          const linear = config as LinearProgression;
          weeks.push({ week, weight: Math.round(weight), reps: 8, sets: 4 });
          weight += linear.weightIncrement;
          break;
        }
        case "double_progression": {
          const dp = config as DoubleProgression;
          if (reps >= dp.repRange[1]) {
            weight += dp.weightIncrement;
            reps = dp.repRange[0];
          }
          weeks.push({ week, weight: Math.round(weight), reps, sets: 4 });
          reps += 1;
          break;
        }
        case "rpe_based": {
          weeks.push({ week, weight: Math.round(weight), reps: 8, sets: 4, rpe: (config as RpeProgression).targetRpe });
          break;
        }
        case "percentage": {
          const pct = config as PercentageProgression;
          weeks.push({ week, weight: Math.round(weight), reps: 8, sets: 4 });
          weight *= (1 + pct.weeklyIncrease);
          break;
        }
        case "wave": {
          const wave = config as WaveProgression;
          const waveData = wave.waves[(week - 1) % wave.waves.length];
          weeks.push({
            week,
            weight: Math.round(startWeight * (waveData.intensityPercent / 100)),
            reps: waveData.reps,
            sets: waveData.sets,
          });
          break;
        }
        default:
          weeks.push({ week, weight: Math.round(weight), reps: 8, sets: 4 });
      }
    }
    return weeks;
  };

  const preview = generatePreview(100);

  return (
    <div className="space-y-6">
      {exerciseName && (
        <div className="text-sm text-gray-400 mb-2">
          Configuring progression for: <span className="text-white font-medium">{exerciseName}</span>
        </div>
      )}

      {/* Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Progression Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PROGRESSION_TYPES.map((pt) => (
            <button
              key={pt.type}
              onClick={() => handleTypeChange(pt.type)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedType === pt.type
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="font-medium text-sm text-white">{pt.label}</div>
              <div className="text-xs text-gray-400 mt-1">{pt.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Type-Specific Configuration */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-4">Configuration</h4>

        {selectedType === "none" && (
          <p className="text-gray-400 text-sm">
            No progression rules will be applied. Weights and reps stay constant.
          </p>
        )}

        {selectedType === "linear" && (
          <LinearConfig
            config={config as LinearProgression}
            onChange={(updates) => updateConfig(updates)}
          />
        )}

        {selectedType === "double_progression" && (
          <DoubleProgressionConfig
            config={config as DoubleProgression}
            onChange={(updates) => updateConfig(updates)}
          />
        )}

        {selectedType === "rpe_based" && (
          <RpeConfig
            config={config as RpeProgression}
            onChange={(updates) => updateConfig(updates)}
          />
        )}

        {selectedType === "percentage" && (
          <PercentageConfig
            config={config as PercentageProgression}
            onChange={(updates) => updateConfig(updates)}
          />
        )}

        {selectedType === "wave" && (
          <WaveConfig
            config={config as WaveProgression}
            onChange={(updates) => updateConfig(updates)}
          />
        )}
      </div>

      {/* Preview */}
      {selectedType !== "none" && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            4-Week Preview (Starting at 100 lbs)
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {preview.map((p) => (
              <div
                key={p.week}
                className="bg-gray-900/50 rounded p-3 text-center"
              >
                <div className="text-xs text-gray-500 mb-1">Week {p.week}</div>
                <div className="text-lg font-bold text-amber-400">{p.weight} lbs</div>
                <div className="text-sm text-gray-400">
                  {p.sets}×{p.reps}
                  {"rpe" in p && ` @RPE${p.rpe}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Linear Progression Config
function LinearConfig({
  config,
  onChange,
}: {
  config: LinearProgression;
  onChange: (updates: Partial<LinearProgression>) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Weight Increment (lbs)
        </label>
        <input
          type="number"
          value={config.weightIncrement}
          onChange={(e) => onChange({ weightIncrement: parseFloat(e.target.value) || 0 })}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          min="0"
          step="2.5"
        />
        <p className="text-xs text-gray-500 mt-1">Add after each success</p>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Deload After (failures)
        </label>
        <input
          type="number"
          value={config.deloadThreshold}
          onChange={(e) => onChange({ deloadThreshold: parseInt(e.target.value) || 1 })}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          min="1"
          max="10"
        />
        <p className="text-xs text-gray-500 mt-1">Consecutive failures</p>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Deload Amount (%)
        </label>
        <input
          type="number"
          value={Math.round(config.deloadPercent * 100)}
          onChange={(e) => onChange({ deloadPercent: (parseFloat(e.target.value) || 0) / 100 })}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          min="5"
          max="30"
          step="5"
        />
        <p className="text-xs text-gray-500 mt-1">Reduce weight by</p>
      </div>
    </div>
  );
}

// Double Progression Config
function DoubleProgressionConfig({
  config,
  onChange,
}: {
  config: DoubleProgression;
  onChange: (updates: Partial<DoubleProgression>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Min Reps</label>
          <input
            type="number"
            value={config.repRange[0]}
            onChange={(e) =>
              onChange({
                repRange: [parseInt(e.target.value) || 6, config.repRange[1]],
              })
            }
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            min="1"
            max="20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Max Reps</label>
          <input
            type="number"
            value={config.repRange[1]}
            onChange={(e) =>
              onChange({
                repRange: [config.repRange[0], parseInt(e.target.value) || 12],
              })
            }
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            min="1"
            max="30"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Weight Increment (lbs)
          </label>
          <input
            type="number"
            value={config.weightIncrement}
            onChange={(e) => onChange({ weightIncrement: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            min="0"
            step="2.5"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Start at {config.repRange[0]} reps. When you hit {config.repRange[1]} reps for all sets,
        add {config.weightIncrement} lbs and reset to {config.repRange[0]} reps.
      </p>
    </div>
  );
}

// RPE-Based Config
function RpeConfig({
  config,
  onChange,
}: {
  config: RpeProgression;
  onChange: (updates: Partial<RpeProgression>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Target RPE</label>
          <input
            type="number"
            value={config.targetRpe}
            onChange={(e) => onChange({ targetRpe: parseFloat(e.target.value) || 8 })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            min="5"
            max="10"
            step="0.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">RPE Range</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={config.rpeRange[0]}
              onChange={(e) =>
                onChange({
                  rpeRange: [parseFloat(e.target.value) || 6, config.rpeRange[1]],
                })
              }
              className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-2 text-white text-sm text-center"
              min="5"
              max="10"
              step="0.5"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={config.rpeRange[1]}
              onChange={(e) =>
                onChange({
                  rpeRange: [config.rpeRange[0], parseFloat(e.target.value) || 9],
                })
              }
              className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-2 text-white text-sm text-center"
              min="5"
              max="10"
              step="0.5"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Adjustment (lbs/RPE)
          </label>
          <input
            type="number"
            value={config.adjustmentPerPoint}
            onChange={(e) => onChange({ adjustmentPerPoint: parseFloat(e.target.value) || 5 })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            min="0"
            step="2.5"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        If RPE is below {config.rpeRange[0]}, increase weight by {config.adjustmentPerPoint} lbs.
        If above {config.rpeRange[1]}, decrease by {config.adjustmentPerPoint} lbs.
      </p>
    </div>
  );
}

// Percentage Config
function PercentageConfig({
  config,
  onChange,
}: {
  config: PercentageProgression;
  onChange: (updates: Partial<PercentageProgression>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Weekly Increase (%)
        </label>
        <input
          type="number"
          value={Math.round(config.weeklyIncrease * 100 * 10) / 10}
          onChange={(e) => onChange({ weeklyIncrease: (parseFloat(e.target.value) || 0) / 100 })}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
          min="0.5"
          max="10"
          step="0.5"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Based On</label>
        <select
          value={config.basedOn}
          onChange={(e) => onChange({ basedOn: e.target.value as "1rm" | "working_weight" })}
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm"
        >
          <option value="working_weight">Working Weight</option>
          <option value="1rm">1RM</option>
        </select>
      </div>
    </div>
  );
}

// Wave Config
function WaveConfig({
  config,
  onChange,
}: {
  config: WaveProgression;
  onChange: (updates: Partial<WaveProgression>) => void;
}) {
  const addWave = () => {
    const newWaves = [
      ...config.waves,
      { week: config.waves.length + 1, intensityPercent: 70, sets: 4, reps: 8 },
    ];
    onChange({ waves: newWaves });
  };

  const updateWave = (index: number, updates: Partial<WaveProgression["waves"][0]>) => {
    const newWaves = config.waves.map((w, i) =>
      i === index ? { ...w, ...updates } : w
    );
    onChange({ waves: newWaves });
  };

  const removeWave = (index: number) => {
    if (config.waves.length <= 1) return;
    const newWaves = config.waves
      .filter((_, i) => i !== index)
      .map((w, i) => ({ ...w, week: i + 1 }));
    onChange({ waves: newWaves });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {config.waves.map((wave, index) => (
          <div
            key={index}
            className="flex items-center gap-3 bg-gray-900/50 rounded p-2"
          >
            <span className="text-xs text-gray-500 w-16">Week {wave.week}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={wave.intensityPercent}
                onChange={(e) =>
                  updateWave(index, { intensityPercent: parseInt(e.target.value) || 70 })
                }
                className="w-16 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm text-center"
                min="40"
                max="100"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={wave.sets}
                onChange={(e) =>
                  updateWave(index, { sets: parseInt(e.target.value) || 3 })
                }
                className="w-14 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm text-center"
                min="1"
                max="10"
              />
              <span className="text-xs text-gray-500">sets</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={wave.reps}
                onChange={(e) =>
                  updateWave(index, { reps: parseInt(e.target.value) || 8 })
                }
                className="w-14 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm text-center"
                min="1"
                max="20"
              />
              <span className="text-xs text-gray-500">reps</span>
            </div>
            {config.waves.length > 1 && (
              <button
                onClick={() => removeWave(index)}
                className="text-red-400 hover:text-red-300 text-sm ml-auto"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={addWave}
        className="text-amber-400 hover:text-amber-300 text-sm"
      >
        + Add Week
      </button>
      <p className="text-xs text-gray-500">
        Intensity is percentage of working weight. Waves cycle through in order.
      </p>
    </div>
  );
}
