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
} from "lucide-react";
import { EXERCISES } from "@/lib/fitness/data";

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
}

interface Athlete {
  relationship_id: string;
  athlete: {
    id: string;
    display_name: string | null;
    email: string;
  };
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

        {/* Weeks */}
        <div className="space-y-4">
          {program.weeks.map((week) => (
            <div
              key={week.id}
              className="rounded-lg overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
                border: "1px solid #3d3d4d",
              }}
            >
              {/* Week Header */}
              <button
                onClick={() =>
                  setExpandedWeek(
                    expandedWeek === week.week_number ? 0 : week.week_number
                  )
                }
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
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
                </div>
                <span className="text-gray-500 text-xs">
                  {week.workouts.filter((w) => !w.rest_day).length} workout days
                </span>
              </button>

              {/* Week Content */}
              {expandedWeek === week.week_number && (
                <div className="px-4 pb-4 grid grid-cols-7 gap-2">
                  {week.workouts.map((workout) => (
                    <div
                      key={workout.id}
                      onClick={() => setEditingWorkout(workout)}
                      className={`p-3 rounded cursor-pointer transition-all hover:scale-105 ${
                        workout.rest_day ? "opacity-50" : ""
                      }`}
                      style={{
                        background: workout.rest_day
                          ? "rgba(0,0,0,0.2)"
                          : workout.exercises.length > 0
                          ? "rgba(95, 191, 138, 0.2)"
                          : "rgba(255, 107, 107, 0.1)",
                        border: workout.rest_day
                          ? "1px dashed #3d3d4d"
                          : workout.exercises.length > 0
                          ? "1px solid #5fbf8a"
                          : "1px solid #FF6B6B33",
                      }}
                    >
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
                    <button
                      onClick={() => setShowExercisePicker(true)}
                      className="flex items-center gap-1 text-xs text-[#5fbf8a] hover:text-[#7dd3a3]"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
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
                      {editingWorkout.exercises.map((ex, i) => (
                        <div
                          key={ex.id}
                          className="p-3 rounded-lg flex items-start gap-3"
                          style={{
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid #3d3d4d",
                          }}
                        >
                          <div className="text-gray-500 text-sm font-mono w-6">
                            {i + 1}.
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="font-medium text-white">
                              {ex.exercise_name}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={ex.sets}
                                  onChange={(e) =>
                                    updateExercise(i, {
                                      sets: parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="w-12 px-2 py-1 rounded bg-black/30 border border-gray-600 text-white text-center text-sm"
                                  min="1"
                                />
                                <span className="text-gray-500 text-xs">sets</span>
                              </div>
                              <span className="text-gray-600">×</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={ex.reps_min}
                                  onChange={(e) =>
                                    updateExercise(i, {
                                      reps_min: parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="w-12 px-2 py-1 rounded bg-black/30 border border-gray-600 text-white text-center text-sm"
                                  min="1"
                                />
                                {ex.reps_max && (
                                  <>
                                    <span className="text-gray-500">-</span>
                                    <input
                                      type="number"
                                      value={ex.reps_max || ""}
                                      onChange={(e) =>
                                        updateExercise(i, {
                                          reps_max: parseInt(e.target.value) || null,
                                        })
                                      }
                                      className="w-12 px-2 py-1 rounded bg-black/30 border border-gray-600 text-white text-center text-sm"
                                      min="1"
                                    />
                                  </>
                                )}
                                <span className="text-gray-500 text-xs">reps</span>
                              </div>
                              <input
                                type="text"
                                value={ex.intensity || ""}
                                onChange={(e) =>
                                  updateExercise(i, { intensity: e.target.value })
                                }
                                placeholder="RPE/intensity"
                                className="w-24 px-2 py-1 rounded bg-black/30 border border-gray-600 text-white placeholder-gray-500 text-sm"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removeExercise(i)}
                            className="text-gray-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
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
              {filteredExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full text-left p-3 rounded hover:bg-black/30 transition-colors"
                >
                  <div className="text-white">{ex.name}</div>
                  <div className="text-gray-500 text-xs capitalize">{ex.muscle}</div>
                </button>
              ))}
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
    </div>
  );
}
