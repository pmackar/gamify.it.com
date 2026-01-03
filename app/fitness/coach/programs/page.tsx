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
    goal: "strength",
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
                  <label className="block text-gray-400 text-sm mb-1">Goal</label>
                  <select
                    value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white focus:border-[#FF6B6B] focus:outline-none"
                  >
                    <option value="strength">Strength</option>
                    <option value="hypertrophy">Hypertrophy</option>
                    <option value="endurance">Endurance</option>
                    <option value="general">General Fitness</option>
                  </select>
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
    </div>
  );
}
