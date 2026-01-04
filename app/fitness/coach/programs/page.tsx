"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  ChevronRight,
  Users,
  Calendar,
  Dumbbell,
  Trash2,
  X,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  Loader2,
  Pencil,
} from "lucide-react";

interface Program {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  difficulty: string | null;
  goal: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  active_assignments: number;
  total_workouts: number;
}

const EQUIPMENT_OPTIONS = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbells" },
  { id: "cable", label: "Cable Machine" },
  { id: "machine", label: "Machines" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "kettlebell", label: "Kettlebells" },
];

const FOCUS_AREAS = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "legs", label: "Legs" },
  { id: "arms", label: "Arms" },
  { id: "core", label: "Core" },
];

export default function ProgramsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_weeks: 4,
    difficulty: "intermediate",
    goalPriorities: ["strength", "hypertrophy", "endurance", "general"] as string[],
  });

  // Edit state
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    duration_weeks: 4,
    difficulty: "intermediate",
    goalPriorities: ["strength", "hypertrophy", "endurance", "general"] as string[],
  });
  const [updating, setUpdating] = useState(false);

  // AI Generation state
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [aiStep, setAiStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [aiForm, setAiForm] = useState({
    goalPriorities: ["strength", "hypertrophy", "endurance", "general"] as string[],
    durationWeeks: 4,
    daysPerWeek: 4,
    experienceLevel: "intermediate" as "beginner" | "intermediate" | "advanced",
    equipment: ["barbell", "dumbbell", "cable", "machine"] as string[],
    focusAreas: [] as string[],
    includeDeload: true,
    programName: "",
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const res = await fetch("/api/fitness/coach/programs");
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error("Error loading programs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/fitness/coach/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/fitness/coach/programs/${data.program.id}`);
      }
    } catch (error) {
      console.error("Error creating program:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (programId: string) => {
    if (!confirm("Delete this program? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/fitness/coach/programs/${programId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPrograms(programs.filter((p) => p.id !== programId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const openEditModal = (program: Program) => {
    setEditingProgram(program);
    // Handle both old (single goal) and new (priority array) formats
    const defaultPriorities = ["strength", "hypertrophy", "endurance", "general"];
    let priorities = defaultPriorities;
    if ((program as any).goal_priorities && Array.isArray((program as any).goal_priorities)) {
      priorities = (program as any).goal_priorities;
    } else if (program.goal) {
      // Move the old single goal to first position
      priorities = [program.goal, ...defaultPriorities.filter(g => g !== program.goal)];
    }
    setEditForm({
      name: program.name,
      description: program.description || "",
      duration_weeks: program.duration_weeks,
      difficulty: program.difficulty || "intermediate",
      goalPriorities: priorities,
    });
  };

  // Helper to reorder priorities by moving an item to a new position
  const reorderPriorities = (priorities: string[], item: string, newIndex: number): string[] => {
    const filtered = priorities.filter(p => p !== item);
    filtered.splice(newIndex, 0, item);
    return filtered;
  };

  const GOAL_INFO: Record<string, { label: string; desc: string }> = {
    strength: { label: "Strength", desc: "Build max strength" },
    hypertrophy: { label: "Hypertrophy", desc: "Build muscle size" },
    endurance: { label: "Endurance", desc: "Muscular endurance" },
    general: { label: "General", desc: "Overall fitness" },
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/fitness/coach/programs/${editingProgram.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        // Update the program in the local list
        setPrograms(programs.map((p) =>
          p.id === editingProgram.id
            ? { ...p, ...editForm }
            : p
        ));
        setEditingProgram(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update");
      }
    } catch (error) {
      console.error("Error updating:", error);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/fitness/coach/programs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiForm),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/fitness/coach/programs/${data.program.id}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to generate program");
      }
    } catch (error) {
      console.error("Error generating:", error);
      alert("Failed to generate program. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleEquipment = (id: string) => {
    setAiForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(id)
        ? prev.equipment.filter((e) => e !== id)
        : [...prev.equipment, id],
    }));
  };

  const toggleFocusArea = (id: string) => {
    setAiForm((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(id)
        ? prev.focusAreas.filter((f) => f !== id)
        : [...prev.focusAreas, id],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-[#FF6B6B] animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Loading programs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] navbar-offset pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/fitness/coach"
              className="text-gray-500 hover:text-white transition-colors"
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
                PROGRAMS
              </h1>
              <p className="text-gray-500 text-sm">
                Create and manage training programs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAiStep(1);
                setShowAIWizard(true);
              }}
              className="flex items-center gap-2 py-2 px-4 rounded-lg transition-all text-sm"
              style={{
                background: "rgba(147, 51, 234, 0.2)",
                border: "1px solid #9333ea",
                color: "#c084fc",
              }}
            >
              <Sparkles className="w-4 h-4" />
              AI Generate
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 py-2 px-4 rounded-lg transition-all"
              style={{
                background: "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)",
                boxShadow: "0 3px 0 #992222",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
                color: "white",
              }}
            >
              <Plus className="w-4 h-4" />
              NEW
            </button>
          </div>
        </div>

        {/* Programs Grid */}
        {programs.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "1px solid #3d3d4d",
            }}
          >
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-white text-lg mb-2">No programs yet</h2>
            <p className="text-gray-500 text-sm mb-6">
              Create your first training program to assign to athletes
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm"
              style={{
                background: "rgba(255, 107, 107, 0.2)",
                border: "1px solid #FF6B6B",
                color: "#FF6B6B",
              }}
            >
              <Plus className="w-4 h-4" />
              Create Program
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {programs.map((program) => (
              <div
                key={program.id}
                className="rounded-lg p-4 transition-all hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
                  border: "1px solid #3d3d4d",
                }}
              >
                <div className="flex items-start justify-between">
                  <Link
                    href={`/fitness/coach/programs/${program.id}`}
                    className="flex-1"
                  >
                    <h3 className="text-white font-bold text-lg mb-1">
                      {program.name}
                    </h3>
                    {program.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {program.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {program.duration_weeks} weeks
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />
                        {program.total_workouts} workouts
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {program.active_assignments} active
                      </span>
                      {program.difficulty && (
                        <span
                          className="px-2 py-0.5 rounded text-xs capitalize"
                          style={{
                            background:
                              program.difficulty === "beginner"
                                ? "rgba(95, 191, 138, 0.2)"
                                : program.difficulty === "intermediate"
                                ? "rgba(255, 215, 0, 0.2)"
                                : "rgba(255, 107, 107, 0.2)",
                            color:
                              program.difficulty === "beginner"
                                ? "#5fbf8a"
                                : program.difficulty === "intermediate"
                                ? "#FFD700"
                                : "#FF6B6B",
                          }}
                        >
                          {program.difficulty}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        openEditModal(program);
                      }}
                      className="p-2 text-gray-500 hover:text-[#FFD700] transition-colors"
                      title="Edit program"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {program.active_assignments === 0 && (
                      <button
                        onClick={() => handleDelete(program.id)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete program"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <Link
                      href={`/fitness/coach/programs/${program.id}`}
                      className="p-2 text-gray-500 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
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
                NEW PROGRAM
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Beginner Strength Program"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Program overview and goals..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">
                      Duration (weeks)
                    </label>
                    <select
                      value={form.duration_weeks}
                      onChange={(e) =>
                        setForm({ ...form, duration_weeks: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white focus:border-[#FF6B6B] focus:outline-none"
                    >
                      {[1, 2, 3, 4, 6, 8, 12, 16].map((w) => (
                        <option key={w} value={w}>
                          {w} {w === 1 ? "week" : "weeks"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-1">
                      Difficulty
                    </label>
                    <select
                      value={form.difficulty}
                      onChange={(e) =>
                        setForm({ ...form, difficulty: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white focus:border-[#FF6B6B] focus:outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Goal Priority (drag to reorder)</label>
                  <div className="space-y-2">
                    {form.goalPriorities.map((goal, idx) => (
                      <div
                        key={goal}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", goal)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedGoal = e.dataTransfer.getData("text/plain");
                          if (draggedGoal !== goal) {
                            setForm({ ...form, goalPriorities: reorderPriorities(form.goalPriorities, draggedGoal, idx) });
                          }
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 border border-gray-600 cursor-grab active:cursor-grabbing hover:border-[#FF6B6B] transition-colors"
                      >
                        <span className="text-[#FF6B6B] font-bold text-sm w-6">{idx + 1}.</span>
                        <span className="text-gray-400 cursor-grab">⋮⋮</span>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{GOAL_INFO[goal]?.label || goal}</div>
                          <div className="text-gray-500 text-xs">{GOAL_INFO[goal]?.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !form.name}
                  className="flex-1 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)",
                    boxShadow: "0 3px 0 #992222",
                    color: "white",
                  }}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Generation Wizard */}
      {showAIWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <div
            className="w-full max-w-lg my-8 p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #9333ea",
              boxShadow: "0 4px 0 rgba(147, 51, 234, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="flex items-center gap-2"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    color: "#c084fc",
                    fontSize: "10px",
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  AI PROGRAM GENERATOR
                </h3>
                <p className="text-gray-500 text-xs mt-2">
                  Step {aiStep} of 3
                </p>
              </div>
              <button
                onClick={() => setShowAIWizard(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Goal & Experience */}
            {aiStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Goal Priority (drag to reorder)
                  </label>
                  <div className="space-y-2">
                    {aiForm.goalPriorities.map((goal, idx) => (
                      <div
                        key={goal}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", goal)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedGoal = e.dataTransfer.getData("text/plain");
                          if (draggedGoal !== goal) {
                            setAiForm({ ...aiForm, goalPriorities: reorderPriorities(aiForm.goalPriorities, draggedGoal, idx) });
                          }
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 border border-gray-600 cursor-grab active:cursor-grabbing hover:border-purple-500 transition-colors"
                      >
                        <span className="text-purple-400 font-bold text-sm w-6">{idx + 1}.</span>
                        <span className="text-gray-400 cursor-grab">⋮⋮</span>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{GOAL_INFO[goal]?.label || goal}</div>
                          <div className="text-gray-500 text-xs">{GOAL_INFO[goal]?.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Experience Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["beginner", "intermediate", "advanced"].map((level) => (
                      <button
                        key={level}
                        onClick={() => setAiForm({ ...aiForm, experienceLevel: level as any })}
                        className={`p-3 rounded-lg capitalize text-sm transition-all ${
                          aiForm.experienceLevel === level
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : "border-gray-700 bg-black/30 text-gray-400 hover:border-gray-600"
                        }`}
                        style={{ border: `1px solid ${aiForm.experienceLevel === level ? "#9333ea" : "#374151"}` }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Duration & Frequency */}
            {aiStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Program Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[4, 6, 8, 12].map((weeks) => (
                      <button
                        key={weeks}
                        onClick={() => setAiForm({ ...aiForm, durationWeeks: weeks })}
                        className={`p-3 rounded-lg text-center transition-all ${
                          aiForm.durationWeeks === weeks
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : "border-gray-700 bg-black/30 text-gray-400 hover:border-gray-600"
                        }`}
                        style={{ border: `1px solid ${aiForm.durationWeeks === weeks ? "#9333ea" : "#374151"}` }}
                      >
                        <div className="font-medium">{weeks}</div>
                        <div className="text-xs">weeks</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Training Days Per Week
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[3, 4, 5, 6, 7].map((days) => (
                      <button
                        key={days}
                        onClick={() => setAiForm({ ...aiForm, daysPerWeek: days })}
                        className={`p-3 rounded-lg text-center transition-all ${
                          aiForm.daysPerWeek === days
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : "border-gray-700 bg-black/30 text-gray-400 hover:border-gray-600"
                        }`}
                        style={{ border: `1px solid ${aiForm.daysPerWeek === days ? "#9333ea" : "#374151"}` }}
                      >
                        {days}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="includeDeload"
                    checked={aiForm.includeDeload}
                    onChange={(e) => setAiForm({ ...aiForm, includeDeload: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="includeDeload" className="text-gray-400 text-sm cursor-pointer">
                    Include deload week at the end
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Equipment & Focus Areas */}
            {aiStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Available Equipment
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <button
                        key={eq.id}
                        onClick={() => toggleEquipment(eq.id)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          aiForm.equipment.includes(eq.id)
                            ? "bg-purple-500/20 text-purple-300 border-purple-500"
                            : "bg-black/30 text-gray-400 border-gray-700 hover:border-gray-600"
                        }`}
                        style={{ border: `1px solid ${aiForm.equipment.includes(eq.id) ? "#9333ea" : "#374151"}` }}
                      >
                        {eq.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Focus Areas (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_AREAS.map((area) => (
                      <button
                        key={area.id}
                        onClick={() => toggleFocusArea(area.id)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          aiForm.focusAreas.includes(area.id)
                            ? "bg-purple-500/20 text-purple-300 border-purple-500"
                            : "bg-black/30 text-gray-400 border-gray-700 hover:border-gray-600"
                        }`}
                        style={{ border: `1px solid ${aiForm.focusAreas.includes(area.id) ? "#9333ea" : "#374151"}` }}
                      >
                        {area.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Program Name (optional)
                  </label>
                  <input
                    type="text"
                    value={aiForm.programName}
                    onChange={(e) => setAiForm({ ...aiForm, programName: e.target.value })}
                    placeholder="e.g., My Strength Program"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              {aiStep > 1 ? (
                <button
                  onClick={() => setAiStep(aiStep - 1)}
                  className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={() => setShowAIWizard(false)}
                  className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40"
                >
                  Cancel
                </button>
              )}

              {aiStep < 3 ? (
                <button
                  onClick={() => setAiStep(aiStep + 1)}
                  className="flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(180deg, #9333ea 0%, #7c22c2 100%)",
                    boxShadow: "0 3px 0 #5b189b",
                    color: "white",
                  }}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleAIGenerate}
                  disabled={generating || aiForm.equipment.length === 0}
                  className="flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(180deg, #9333ea 0%, #7c22c2 100%)",
                    boxShadow: "0 3px 0 #5b189b",
                    color: "white",
                  }}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Program
                    </>
                  )}
                </button>
              )}
            </div>

            {aiStep === 3 && (
              <p className="text-gray-600 text-xs text-center mt-4">
                AI will create a complete program with exercises, sets, and reps
              </p>
            )}
          </div>
        </div>
      )}

      {/* Edit Program Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div
            className="w-full max-w-md p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #FFD700",
              boxShadow: "0 4px 0 rgba(255, 215, 0, 0.3)",
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
                EDIT PROGRAM
              </h3>
              <button
                onClick={() => setEditingProgram(null)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g., Beginner Strength Program"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    placeholder="Program overview and goals..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">
                      Duration (weeks)
                    </label>
                    <select
                      value={editForm.duration_weeks}
                      onChange={(e) =>
                        setEditForm({ ...editForm, duration_weeks: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white focus:border-[#FFD700] focus:outline-none"
                    >
                      {[1, 2, 3, 4, 6, 8, 12, 16].map((w) => (
                        <option key={w} value={w}>
                          {w} {w === 1 ? "week" : "weeks"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-1">
                      Difficulty
                    </label>
                    <select
                      value={editForm.difficulty}
                      onChange={(e) =>
                        setEditForm({ ...editForm, difficulty: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white focus:border-[#FFD700] focus:outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Goal Priority (drag to reorder)</label>
                  <div className="space-y-2">
                    {editForm.goalPriorities.map((goal, idx) => (
                      <div
                        key={goal}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", goal)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedGoal = e.dataTransfer.getData("text/plain");
                          if (draggedGoal !== goal) {
                            setEditForm({ ...editForm, goalPriorities: reorderPriorities(editForm.goalPriorities, draggedGoal, idx) });
                          }
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-black/30 border border-gray-600 cursor-grab active:cursor-grabbing hover:border-[#FFD700] transition-colors"
                      >
                        <span className="text-[#FFD700] font-bold text-sm w-6">{idx + 1}.</span>
                        <span className="text-gray-400 cursor-grab">⋮⋮</span>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{GOAL_INFO[goal]?.label || goal}</div>
                          <div className="text-gray-500 text-xs">{GOAL_INFO[goal]?.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editForm.name}
                  className="flex-1 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(180deg, #FFD700 0%, #cc9900 100%)",
                    boxShadow: "0 3px 0 #996600",
                    color: "#1a1a2e",
                  }}
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>

              <p className="text-gray-500 text-xs text-center mt-4">
                To edit workouts, click the program to open the full editor
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
