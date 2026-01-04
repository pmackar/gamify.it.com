"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Users,
  Calendar,
  Trash2,
  Copy,
  UserPlus,
  BookmarkPlus,
  FolderOpen,
  TrendingUp,
  History,
  RotateCcw,
} from "lucide-react";
import { EXERCISES, getExerciseTier, TIER_COLORS } from "@/lib/fitness/data";
import { ProgressionConfig } from "@/lib/fitness/types";
import ProgressionBuilder from "@/components/fitness/ProgressionBuilder";

interface Exercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  order_index: number;
  sets: number;
  reps_min: number;
  reps_max: number | null;
  intensity: string | null;
  rest_seconds: number | null;
  notes: string | null;
}

interface Workout {
  id: string;
  day_number: number;
  name: string;
  notes: string | null;
  rest_day: boolean;
  exercises: Exercise[];
}

interface Week {
  id: string;
  week_number: number;
  name: string | null;
  notes: string | null;
  workouts: Workout[];
}

interface Program {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  difficulty: string | null;
  goal: string | null;
  weeks: Week[];
  assignments: any[];
  progression_config: ProgressionConfig | null;
}

interface Athlete {
  relationship_id: string;
  athlete: {
    id: string;
    display_name: string | null;
    email: string;
  };
}

interface Version {
  id: string;
  version: number;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export default function ProgramEditorPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [copiedWeek, setCopiedWeek] = useState<Week | null>(null);
  const [copiedWorkout, setCopiedWorkout] = useState<Workout | null>(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [showProgressionBuilder, setShowProgressionBuilder] = useState(false);
  const [savingProgression, setSavingProgression] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  useEffect(() => {
    loadProgram();
    loadAthletes();
  }, [programId]);

  const loadProgram = async () => {
    try {
      const res = await fetch(`/api/fitness/coach/programs/${programId}`);
      if (res.ok) {
        const data = await res.json();
        setProgram(data.program);
      } else {
        router.push("/fitness/coach/programs");
      }
    } catch (error) {
      console.error("Error loading program:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAthletes = async () => {
    try {
      const res = await fetch("/api/fitness/coach/athletes");
      if (res.ok) {
        const data = await res.json();
        setAthletes(
          (data.athletes || []).filter((a: any) => a.status === "ACTIVE")
        );
      }
    } catch (error) {
      console.error("Error loading athletes:", error);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/fitness/coach/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const saveWorkoutAsTemplate = async () => {
    if (!editingWorkout || editingWorkout.exercises.length === 0) return;

    const templateName = prompt("Template name:", editingWorkout.name || "New Template");
    if (!templateName) return;

    setSavingTemplate(true);
    try {
      const res = await fetch("/api/fitness/coach/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: `Created from ${program?.name || "program"}`,
          exercises: editingWorkout.exercises.map((ex) => ({
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            sets: ex.sets,
            reps_min: ex.reps_min,
            reps_max: ex.reps_max,
            intensity: ex.intensity,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
          })),
        }),
      });
      if (res.ok) {
        alert("Template saved!");
      }
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSavingTemplate(false);
    }
  };

  const loadTemplateIntoWorkout = (template: any) => {
    if (!editingWorkout) return;

    setEditingWorkout({
      ...editingWorkout,
      exercises: template.exercises.map((ex: any, i: number) => ({
        id: `template-${Date.now()}-${i}`,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        order_index: i,
        sets: ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        intensity: ex.intensity,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
      })),
    });
    setShowTemplatePicker(false);
  };

  const copyWeek = (week: Week) => {
    setCopiedWeek(week);
    setCopiedWorkout(null);
  };

  const pasteWeekTo = async (targetWeek: Week) => {
    if (!copiedWeek || !program) return;

    const confirmed = confirm(
      `Replace Week ${targetWeek.week_number} with Week ${copiedWeek.week_number}?`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/fitness/coach/programs/${programId}/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "copy_week",
            source_week_id: copiedWeek.id,
            target_week_id: targetWeek.id,
          }),
        }
      );

      if (res.ok) {
        await loadProgram();
        setCopiedWeek(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to paste week");
      }
    } catch (error) {
      console.error("Error pasting week:", error);
    } finally {
      setSaving(false);
    }
  };

  const copyWorkout = (workout: Workout) => {
    setCopiedWorkout(workout);
    setCopiedWeek(null);
  };

  const pasteWorkoutTo = async (targetWorkout: Workout) => {
    if (!copiedWorkout || !program) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/fitness/coach/programs/${programId}/workouts/${targetWorkout.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: copiedWorkout.name,
            notes: copiedWorkout.notes,
            rest_day: copiedWorkout.rest_day,
            exercises: copiedWorkout.exercises.map((ex, i) => ({
              exercise_id: ex.exercise_id,
              exercise_name: ex.exercise_name,
              order_index: i,
              sets: ex.sets,
              reps_min: ex.reps_min,
              reps_max: ex.reps_max,
              intensity: ex.intensity,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes,
            })),
          }),
        }
      );

      if (res.ok) {
        await loadProgram();
        setCopiedWorkout(null);
      }
    } catch (error) {
      console.error("Error pasting workout:", error);
    } finally {
      setSaving(false);
    }
  };

  const saveProgressionConfig = async (config: ProgressionConfig) => {
    if (!program) return;
    setSavingProgression(true);
    try {
      const res = await fetch(`/api/fitness/coach/programs/${programId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progression_config: config }),
      });

      if (res.ok) {
        setProgram({ ...program, progression_config: config });
      }
    } catch (error) {
      console.error("Error saving progression:", error);
    } finally {
      setSavingProgression(false);
    }
  };

  const loadVersions = async () => {
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/fitness/coach/programs/${programId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error("Error loading versions:", error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const createVersion = async () => {
    const notes = prompt("Version notes (optional):", `Saved at ${new Date().toLocaleString()}`);
    if (notes === null) return; // User cancelled

    setSavingVersion(true);
    try {
      const res = await fetch(`/api/fitness/coach/programs/${programId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        await loadVersions();
        alert("Version saved!");
      }
    } catch (error) {
      console.error("Error creating version:", error);
    } finally {
      setSavingVersion(false);
    }
  };

  const restoreVersion = async (versionId: string, versionNum: number) => {
    const confirmed = confirm(
      `Restore to version ${versionNum}? This will overwrite current program data.`
    );
    if (!confirmed) return;

    setRestoringVersion(versionId);
    try {
      const res = await fetch(
        `/api/fitness/coach/programs/${programId}/versions/${versionId}`,
        { method: "POST" }
      );

      if (res.ok) {
        await loadProgram();
        setShowVersionHistory(false);
        alert(`Restored to version ${versionNum}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to restore version");
      }
    } catch (error) {
      console.error("Error restoring version:", error);
    } finally {
      setRestoringVersion(null);
    }
  };

  const saveWorkout = async () => {
    if (!editingWorkout || !program) return;
    setSaving(true);

    try {
      const res = await fetch(
        `/api/fitness/coach/programs/${programId}/workouts/${editingWorkout.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingWorkout.name,
            notes: editingWorkout.notes,
            rest_day: editingWorkout.rest_day,
            exercises: editingWorkout.exercises.map((ex, i) => ({
              exercise_id: ex.exercise_id,
              exercise_name: ex.exercise_name,
              order_index: i,
              sets: ex.sets,
              reps_min: ex.reps_min,
              reps_max: ex.reps_max,
              intensity: ex.intensity,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes,
            })),
          }),
        }
      );

      if (res.ok) {
        await loadProgram();
        setEditingWorkout(null);
      }
    } catch (error) {
      console.error("Error saving workout:", error);
    } finally {
      setSaving(false);
    }
  };

  const addExercise = (exercise: { id: string; name: string }) => {
    if (!editingWorkout) return;

    setEditingWorkout({
      ...editingWorkout,
      exercises: [
        ...editingWorkout.exercises,
        {
          id: `new-${Date.now()}`,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          order_index: editingWorkout.exercises.length,
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          intensity: null,
          rest_seconds: 90,
          notes: null,
        },
      ],
    });
    setShowExercisePicker(false);
    setExerciseSearch("");
  };

  const removeExercise = (index: number) => {
    if (!editingWorkout) return;
    setEditingWorkout({
      ...editingWorkout,
      exercises: editingWorkout.exercises.filter((_, i) => i !== index),
    });
  };

  const updateExercise = (index: number, updates: Partial<Exercise>) => {
    if (!editingWorkout) return;
    const exercises = [...editingWorkout.exercises];
    exercises[index] = { ...exercises[index], ...updates };
    setEditingWorkout({ ...editingWorkout, exercises });
  };

  const handleAssign = async () => {
    if (!selectedAthlete || !startDate) return;
    setSaving(true);

    try {
      const res = await fetch(
        `/api/fitness/coach/programs/${programId}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            athlete_id: selectedAthlete,
            start_date: startDate,
          }),
        }
      );

      if (res.ok) {
        setShowAssign(false);
        await loadProgram();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to assign");
      }
    } catch (error) {
      console.error("Error assigning:", error);
    } finally {
      setSaving(false);
    }
  };

  const filteredExercises = EXERCISES.filter(
    (ex) =>
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.muscle.toLowerCase().includes(exerciseSearch.toLowerCase())
  ).slice(0, 20);

  if (loading || !program) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 text-[#FF6B6B] animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Loading program...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] navbar-offset pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <Link
              href="/fitness/coach/programs"
              className="text-gray-500 hover:text-white transition-colors mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1
                className="text-lg mb-1"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: "#FFD700",
                }}
              >
                {program.name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {program.duration_weeks} weeks
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {program.assignments.length} active
                </span>
                {program.difficulty && (
                  <span className="capitalize">{program.difficulty}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProgressionBuilder(true)}
              className="flex items-center gap-2 py-2 px-4 rounded-lg transition-all text-sm"
              style={{
                background: program?.progression_config && program.progression_config.type !== "none"
                  ? "rgba(255, 215, 0, 0.2)"
                  : "rgba(107, 114, 128, 0.2)",
                border: program?.progression_config && program.progression_config.type !== "none"
                  ? "1px solid #FFD700"
                  : "1px solid #6b7280",
                color: program?.progression_config && program.progression_config.type !== "none"
                  ? "#FFD700"
                  : "#9ca3af",
              }}
            >
              <TrendingUp className="w-4 h-4" />
              Progression
            </button>
            <button
              onClick={() => {
                loadVersions();
                setShowVersionHistory(true);
              }}
              className="flex items-center gap-2 py-2 px-4 rounded-lg transition-all text-sm"
              style={{
                background: "rgba(107, 114, 128, 0.2)",
                border: "1px solid #6b7280",
                color: "#9ca3af",
              }}
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 py-2 px-4 rounded-lg transition-all text-sm"
              style={{
                background: "rgba(95, 191, 138, 0.2)",
                border: "1px solid #5fbf8a",
                color: "#5fbf8a",
              }}
            >
              <UserPlus className="w-4 h-4" />
              Assign
            </button>
          </div>
        </div>

        {/* Clipboard Indicator */}
        {(copiedWeek || copiedWorkout) && (
          <div
            className="mb-4 p-3 rounded-lg flex items-center justify-between"
            style={{
              background: "rgba(255, 215, 0, 0.1)",
              border: "1px dashed #FFD700",
            }}
          >
            <div className="flex items-center gap-2 text-sm text-[#FFD700]">
              <Copy className="w-4 h-4" />
              {copiedWeek
                ? `Week ${copiedWeek.week_number} copied`
                : `${copiedWorkout?.name || "Workout"} copied`}
            </div>
            <button
              onClick={() => {
                setCopiedWeek(null);
                setCopiedWorkout(null);
              }}
              className="text-gray-500 hover:text-white text-xs"
            >
              Clear
            </button>
          </div>
        )}

        {/* Weeks */}
        <div className="space-y-4">
          {program.weeks.map((week) => (
            <div
              key={week.id}
              className="rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
                border: copiedWeek?.id === week.id ? "1px solid #FFD700" : "1px solid #3d3d4d",
              }}
            >
              {/* Week Header */}
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() =>
                    setExpandedWeek(
                      expandedWeek === week.week_number ? 0 : week.week_number
                    )
                  }
                  className="flex items-center gap-3"
                >
                  {expandedWeek === week.week_number ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <span
                    className="font-bold text-white"
                    style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}
                  >
                    WEEK {week.week_number}
                  </span>
                  {week.name && (
                    <span className="text-gray-400 text-sm">- {week.name}</span>
                  )}
                </button>
                <div className="flex items-center gap-3">
                  {copiedWeek && copiedWeek.id !== week.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        pasteWeekTo(week);
                      }}
                      className="text-xs px-2 py-1 rounded bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/30"
                    >
                      Paste Here
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyWeek(week);
                    }}
                    className="text-gray-500 hover:text-white"
                    title="Copy Week"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <span className="text-gray-500 text-xs">
                    {week.workouts.filter((w) => !w.rest_day).length} workout days
                  </span>
                </div>
              </div>

              {/* Week Content */}
              {expandedWeek === week.week_number && (
                <div className="px-4 pb-4 grid grid-cols-7 gap-2">
                  {week.workouts.map((workout) => (
                    <div
                      key={workout.id}
                      className={`relative p-3 rounded cursor-pointer transition-all hover:scale-105 group ${
                        workout.rest_day ? "opacity-50" : ""
                      }`}
                      style={{
                        background: copiedWorkout?.id === workout.id
                          ? "rgba(255, 215, 0, 0.2)"
                          : workout.rest_day
                          ? "rgba(0,0,0,0.2)"
                          : workout.exercises.length > 0
                          ? "rgba(95, 191, 138, 0.2)"
                          : "rgba(255, 107, 107, 0.1)",
                        border: copiedWorkout?.id === workout.id
                          ? "1px solid #FFD700"
                          : workout.rest_day
                          ? "1px dashed #3d3d4d"
                          : workout.exercises.length > 0
                          ? "1px solid #5fbf8a"
                          : "1px solid #FF6B6B33",
                      }}
                      onClick={() => {
                        if (copiedWorkout && copiedWorkout.id !== workout.id) {
                          pasteWorkoutTo(workout);
                        } else {
                          setEditingWorkout(workout);
                        }
                      }}
                    >
                      {/* Quick copy button */}
                      {!workout.rest_day && workout.exercises.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyWorkout(workout);
                          }}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-[#FFD700]"
                          title="Copy Workout"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                      {/* Paste indicator */}
                      {copiedWorkout && copiedWorkout.id !== workout.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[#FFD700] text-xs font-bold">PASTE</span>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          Day {workout.day_number}
                        </p>
                        <p
                          className="text-xs font-bold truncate"
                          style={{
                            color: workout.rest_day
                              ? "#6b7280"
                              : workout.exercises.length > 0
                              ? "#5fbf8a"
                              : "#9ca3af",
                          }}
                        >
                          {workout.rest_day
                            ? "REST"
                            : workout.name || "Untitled"}
                        </p>
                        {!workout.rest_day && (
                          <p className="text-xs text-gray-500 mt-1">
                            {workout.exercises.length} ex
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Workout Modal */}
      {editingWorkout && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 overflow-y-auto">
          <div
            className="w-full max-w-2xl my-8 p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #3d3d4d",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3
                  className="text-sm"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    color: "#FFD700",
                    fontSize: "10px",
                  }}
                >
                  EDIT WORKOUT
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                  Day {editingWorkout.day_number}
                </p>
              </div>
              <button
                onClick={() => setEditingWorkout(null)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Workout Name */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm mb-1">
                    Workout Name
                  </label>
                  <input
                    type="text"
                    value={editingWorkout.name}
                    onChange={(e) =>
                      setEditingWorkout({ ...editingWorkout, name: e.target.value })
                    }
                    placeholder="e.g., Push Day A"
                    className="w-full px-4 py-2 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingWorkout.rest_day}
                      onChange={(e) =>
                        setEditingWorkout({
                          ...editingWorkout,
                          rest_day: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-gray-400 text-sm">Rest Day</span>
                  </label>
                </div>
              </div>

              {/* Exercises */}
              {!editingWorkout.rest_day && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-gray-400 text-sm">Exercises</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          loadTemplates();
                          setShowTemplatePicker(true);
                        }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#FFD700]"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Load Template
                      </button>
                      {editingWorkout.exercises.length > 0 && (
                        <button
                          onClick={saveWorkoutAsTemplate}
                          disabled={savingTemplate}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#5fbf8a]"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                          {savingTemplate ? "Saving..." : "Save as Template"}
                        </button>
                      )}
                      <button
                        onClick={() => setShowExercisePicker(true)}
                        className="flex items-center gap-1 text-xs text-[#5fbf8a] hover:text-[#7dd3a3]"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>

                  {editingWorkout.exercises.length === 0 ? (
                    <div
                      className="text-center py-8 rounded-lg"
                      style={{ background: "rgba(0,0,0,0.2)" }}
                    >
                      <Dumbbell className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No exercises yet</p>
                      <button
                        onClick={() => setShowExercisePicker(true)}
                        className="mt-2 text-[#5fbf8a] text-sm hover:underline"
                      >
                        Add exercises
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editingWorkout.exercises.map((ex, i) => {
                        const isExpanded = editingExerciseIndex === i;
                        const isCustom = ex.exercise_id.startsWith("custom_");
                        const tier = getExerciseTier(ex.exercise_id) as 1 | 2 | 3;
                        const colors = TIER_COLORS[tier];

                        return (
                        <div
                          key={ex.id}
                          className="rounded-lg overflow-hidden"
                          style={{
                            background: "rgba(0,0,0,0.2)",
                            border: isExpanded ? "1px solid #FFD700" : "1px solid #3d3d4d",
                          }}
                        >
                          {/* Exercise Header - Click to expand */}
                          <div
                            className="p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5"
                            onClick={() => setEditingExerciseIndex(isExpanded ? null : i)}
                          >
                            <div className="text-gray-500 text-sm font-mono w-6">
                              {i + 1}.
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">
                                  {ex.exercise_name}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                  style={{
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.text,
                                  }}
                                >
                                  {isCustom ? "CUSTOM" : colors.label}
                                </span>
                              </div>
                              <div className="text-gray-500 text-xs mt-1">
                                {ex.sets} sets × {ex.reps_min}{ex.reps_max ? `-${ex.reps_max}` : ""} reps
                                {ex.intensity && ` @ ${ex.intensity}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeExercise(i);
                                }}
                                className="text-gray-500 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Edit Panel */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-700">
                              {/* Sets and Reps Row */}
                              <div className="flex flex-wrap gap-3">
                                <div>
                                  <label className="block text-gray-500 text-xs mb-1">Sets</label>
                                  <input
                                    type="number"
                                    value={ex.sets}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        sets: parseInt(e.target.value) || 1,
                                      })
                                    }
                                    className="w-20 px-3 py-2 rounded bg-black/30 border border-gray-600 text-white text-center"
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-gray-500 text-xs mb-1">Reps Min</label>
                                  <input
                                    type="number"
                                    value={ex.reps_min}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        reps_min: parseInt(e.target.value) || 1,
                                      })
                                    }
                                    className="w-20 px-3 py-2 rounded bg-black/30 border border-gray-600 text-white text-center"
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-gray-500 text-xs mb-1">Reps Max</label>
                                  <input
                                    type="number"
                                    value={ex.reps_max || ""}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        reps_max: e.target.value ? parseInt(e.target.value) : null,
                                      })
                                    }
                                    placeholder="-"
                                    className="w-20 px-3 py-2 rounded bg-black/30 border border-gray-600 text-white text-center placeholder-gray-600"
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-gray-500 text-xs mb-1">Intensity</label>
                                  <input
                                    type="text"
                                    value={ex.intensity || ""}
                                    onChange={(e) =>
                                      updateExercise(i, { intensity: e.target.value || null })
                                    }
                                    placeholder="RPE 8"
                                    className="w-24 px-3 py-2 rounded bg-black/30 border border-gray-600 text-white placeholder-gray-600"
                                  />
                                </div>
                                <div>
                                  <label className="block text-gray-500 text-xs mb-1">Rest (sec)</label>
                                  <input
                                    type="number"
                                    value={ex.rest_seconds || ""}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        rest_seconds: e.target.value ? parseInt(e.target.value) : null,
                                      })
                                    }
                                    placeholder="90"
                                    className="w-20 px-3 py-2 rounded bg-black/30 border border-gray-600 text-white text-center placeholder-gray-600"
                                  />
                                </div>
                              </div>

                              {/* Notes */}
                              <div>
                                <label className="block text-gray-500 text-xs mb-1">Notes</label>
                                <input
                                  type="text"
                                  value={ex.notes || ""}
                                  onChange={(e) =>
                                    updateExercise(i, { notes: e.target.value || null })
                                  }
                                  placeholder="Coaching cues, form notes..."
                                  className="w-full px-3 py-1.5 rounded bg-black/30 border border-gray-600 text-white text-sm placeholder-gray-600"
                                />
                              </div>

                              {/* Done button */}
                              <button
                                onClick={() => setEditingExerciseIndex(null)}
                                className="text-xs text-[#5fbf8a] hover:text-[#7dd3a3]"
                              >
                                Done editing
                              </button>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Notes</label>
                <textarea
                  value={editingWorkout.notes || ""}
                  onChange={(e) =>
                    setEditingWorkout({ ...editingWorkout, notes: e.target.value })
                  }
                  placeholder="Coaching notes for this workout..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingWorkout(null)}
                className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40"
              >
                Cancel
              </button>
              <button
                onClick={saveWorkout}
                disabled={saving}
                className="flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #5fbf8a 0%, #4aa872 100%)",
                  boxShadow: "0 3px 0 #3d8d61",
                  color: "white",
                }}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Picker */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div
            className="w-full max-w-md p-4 rounded-lg max-h-[80vh] flex flex-col"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #3d3d4d",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-bold">Add Exercise</h4>
              <button
                onClick={() => {
                  setShowExercisePicker(false);
                  setExerciseSearch("");
                }}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full px-4 py-2 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex-1 overflow-y-auto space-y-1">
              {/* Create Custom Exercise option */}
              {exerciseSearch.trim().length > 0 && (
                <button
                  onClick={() => {
                    const customName = exerciseSearch.trim();
                    const customId = `custom_${customName.toLowerCase().replace(/\s+/g, "_")}`;
                    addExercise({ id: customId, name: customName });
                  }}
                  className="w-full text-left p-3 rounded hover:bg-[#5fbf8a]/20 transition-colors border border-dashed border-[#5fbf8a]/50 mb-2"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#5fbf8a]" />
                    <span className="text-[#5fbf8a]">Create "{exerciseSearch.trim()}"</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        background: TIER_COLORS[3].bg,
                        border: `1px solid ${TIER_COLORS[3].border}`,
                        color: TIER_COLORS[3].text,
                      }}
                    >
                      CUSTOM
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs ml-6">Add as custom exercise</div>
                </button>
              )}
              {filteredExercises.map((ex) => {
                const tier = getExerciseTier(ex.id) as 1 | 2 | 3;
                const colors = TIER_COLORS[tier];
                return (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className="w-full text-left p-3 rounded hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white">{ex.name}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {colors.label}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs capitalize">{ex.muscle}</div>
                  </button>
                );
              })}
              {filteredExercises.length === 0 && exerciseSearch.trim().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Start typing to search exercises</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div
            className="w-full max-w-md p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #3d3d4d",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: "#FFD700",
                  fontSize: "10px",
                }}
              >
                ASSIGN PROGRAM
              </h3>
              <button
                onClick={() => setShowAssign(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Select Athlete
                </label>
                <select
                  value={selectedAthlete}
                  onChange={(e) => setSelectedAthlete(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white focus:border-[#FF6B6B] focus:outline-none"
                >
                  <option value="">Choose an athlete...</option>
                  {athletes.map((a) => (
                    <option key={a.athlete.id} value={a.athlete.id}>
                      {a.athlete.display_name || a.athlete.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white focus:border-[#FF6B6B] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssign(false)}
                className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={saving || !selectedAthlete}
                className="flex-1 py-3 rounded-lg font-bold disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #5fbf8a 0%, #4aa872 100%)",
                  boxShadow: "0 3px 0 #3d8d61",
                  color: "white",
                }}
              >
                {saving ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div
            className="w-full max-w-lg p-4 rounded-lg max-h-[80vh] flex flex-col"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #FFD700",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4
                className="font-bold"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "10px",
                  color: "#FFD700",
                }}
              >
                LOAD TEMPLATE
              </h4>
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTemplates ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-400">Loading templates...</div>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-500 text-center">No templates yet</p>
                <p className="text-gray-600 text-sm text-center mt-1">
                  Create exercises in a workout and save as template
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => loadTemplateIntoWorkout(template)}
                    className="w-full text-left p-4 rounded-lg hover:bg-black/30 transition-colors"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: template.is_own
                        ? "1px solid #5fbf8a"
                        : "1px solid #3d3d4d",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">
                        {template.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.exercise_count} exercises
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-gray-500 text-sm mb-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {template.exercises.slice(0, 4).map((ex: any) => {
                        const tier = getExerciseTier(ex.exercise_id) as 1 | 2 | 3;
                        const colors = TIER_COLORS[tier];
                        return (
                          <span
                            key={ex.id}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              background: colors.bg,
                              color: colors.text,
                            }}
                          >
                            {ex.exercise_name}
                          </span>
                        );
                      })}
                      {template.exercises.length > 4 && (
                        <span className="text-xs text-gray-500 px-2 py-0.5">
                          +{template.exercises.length - 4} more
                        </span>
                      )}
                    </div>
                    {!template.is_own && (
                      <div className="text-xs text-gray-600 mt-2">
                        by {template.coach_name}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <p className="text-gray-600 text-xs text-center mt-4">
              Loading a template will replace current exercises
            </p>
          </div>
        </div>
      )}

      {/* Progression Builder Modal */}
      {showProgressionBuilder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 overflow-y-auto">
          <div
            className="w-full max-w-2xl my-8 p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #FFD700",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="text-sm"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    color: "#FFD700",
                    fontSize: "10px",
                  }}
                >
                  PROGRESSION RULES
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                  Configure how weights and reps increase over time
                </p>
              </div>
              <button
                onClick={() => setShowProgressionBuilder(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ProgressionBuilder
              value={program?.progression_config || null}
              onChange={(config) => {
                saveProgressionConfig(config);
              }}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowProgressionBuilder(false)}
                className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40"
              >
                Close
              </button>
              {savingProgression && (
                <div className="flex items-center text-gray-400 text-sm">
                  Saving...
                </div>
              )}
            </div>

            <p className="text-gray-600 text-xs text-center mt-4">
              Changes are saved automatically
            </p>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 overflow-y-auto">
          <div
            className="w-full max-w-lg my-8 p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #6b7280",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="text-sm"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    color: "#FFD700",
                    fontSize: "10px",
                  }}
                >
                  VERSION HISTORY
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                  Save and restore program snapshots
                </p>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Save Current Version Button */}
            <button
              onClick={createVersion}
              disabled={savingVersion}
              className="w-full mb-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: "linear-gradient(180deg, #5fbf8a 0%, #4aa872 100%)",
                boxShadow: "0 3px 0 #3d8d61",
                color: "white",
              }}
            >
              <Save className="w-4 h-4" />
              {savingVersion ? "Saving..." : "Save Current Version"}
            </button>

            {/* Version List */}
            {loadingVersions ? (
              <div className="py-8 text-center text-gray-400">
                Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <div className="py-8 text-center">
                <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No versions saved yet</p>
                <p className="text-gray-600 text-sm mt-1">
                  Click "Save Current Version" to create a snapshot
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="p-4 rounded-lg flex items-center justify-between"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid #3d3d4d",
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            background: "rgba(255, 215, 0, 0.2)",
                            color: "#FFD700",
                          }}
                        >
                          v{version.version}
                        </span>
                        <span className="text-white text-sm">
                          {version.notes || `Version ${version.version}`}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => restoreVersion(version.id, version.version)}
                      disabled={restoringVersion === version.id}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-all disabled:opacity-50"
                      style={{
                        background: "rgba(107, 114, 128, 0.2)",
                        border: "1px solid #6b7280",
                        color: "#9ca3af",
                      }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {restoringVersion === version.id ? "..." : "Restore"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowVersionHistory(false)}
                className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
