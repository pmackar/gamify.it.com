"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Users,
  X,
  Trash2,
  Edit,
  UserPlus,
  UserMinus,
  MessageCircle,
} from "lucide-react";
import GroupChatPanel from "@/components/fitness/GroupChatPanel";

interface Athlete {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface GroupMember {
  id: string;
  athlete: Athlete;
  joined_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  members: GroupMember[];
  _count: { members: number };
}

const GROUP_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#FFD700", // Gold
  "#5CC9F5", // Blue
  "#9B59B6", // Purple
  "#5fbf8a", // Green
  "#F39C12", // Orange
  "#E91E63", // Pink
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState<string | null>(null);
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatGroupId, setChatGroupId] = useState<string | null>(null);

  // Form state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGroups();
    loadAthletes();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.user?.id || null);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch("/api/fitness/coach/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAthletes = async () => {
    try {
      const res = await fetch("/api/fitness/coach/athletes");
      if (res.ok) {
        const data = await res.json();
        setAllAthletes(
          data.athletes
            ?.filter((a: any) => a.status === "ACTIVE")
            .map((a: any) => a.athlete) || []
        );
      }
    } catch (error) {
      console.error("Error loading athletes:", error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/fitness/coach/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
          color: newGroupColor,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewGroupName("");
        setNewGroupDescription("");
        loadGroups();
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Delete this group? Members will not be removed from your roster.")) return;

    try {
      await fetch(`/api/fitness/coach/groups/${groupId}`, { method: "DELETE" });
      loadGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const handleAddMembers = async (groupId: string, athleteIds: string[]) => {
    try {
      await fetch(`/api/fitness/coach/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteIds }),
      });
      setShowAddMembersModal(null);
      loadGroups();
    } catch (error) {
      console.error("Error adding members:", error);
    }
  };

  const handleRemoveMember = async (groupId: string, athleteId: string) => {
    try {
      await fetch(`/api/fitness/coach/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteIds: [athleteId] }),
      });
      loadGroups();
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 text-[#4ECDC4] animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Loading groups...</p>
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
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1
                className="text-lg"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: "#4ECDC4",
                }}
              >
                GROUPS
              </h1>
              <p className="text-gray-500 text-sm">Organize your athletes</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 py-2 px-4 rounded-lg transition-all"
            style={{
              background: "linear-gradient(180deg, #4ECDC4 0%, #3db3ab 100%)",
              boxShadow: "0 3px 0 #2a8a84",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
              color: "white",
            }}
          >
            <Plus className="w-4 h-4" />
            NEW GROUP
          </button>
        </div>

        {/* Groups List */}
        {groups.length === 0 ? (
          <div
            className="p-8 rounded-lg text-center"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "1px solid #3d3d4d",
            }}
          >
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No groups yet</p>
            <p className="text-gray-500 text-sm">
              Create groups to organize athletes by program, schedule, or skill level.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-lg"
                style={{
                  background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
                  border: "1px solid #3d3d4d",
                  borderLeft: `4px solid ${group.color || "#4ECDC4"}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold">{group.name}</h3>
                    {group.description && (
                      <p className="text-gray-500 text-sm mt-1">{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setChatGroupId(group.id)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      style={{ color: group.color || "#4ECDC4" }}
                      title="Group chat"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowAddMembersModal(group.id)}
                      className="p-2 hover:bg-white/10 rounded transition-colors text-[#4ECDC4]"
                      title="Add members"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-2 hover:bg-white/10 rounded transition-colors text-red-400"
                      title="Delete group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Members */}
                <div className="flex flex-wrap gap-2">
                  {group.members.length === 0 ? (
                    <p className="text-gray-500 text-sm">No members</p>
                  ) : (
                    group.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 group"
                      >
                        {member.athlete.avatar_url ? (
                          <img
                            src={member.athlete.avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[8px] text-white">
                            {(member.athlete.display_name || member.athlete.email)[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-gray-300 text-sm">
                          {member.athlete.display_name || member.athlete.email.split("@")[0]}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(group.id, member.athlete.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div
            className="w-full max-w-md p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #3d3d4d",
            }}
          >
            <h3
              className="text-sm mb-4"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#4ECDC4",
                fontSize: "10px",
              }}
            >
              CREATE GROUP
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Morning Crew"
                  className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#4ECDC4] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#4ECDC4] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewGroupColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newGroupColor === color ? "scale-125 ring-2 ring-white" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || creating}
                className="flex-1 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #4ECDC4 0%, #3db3ab 100%)",
                  boxShadow: "0 3px 0 #2a8a84",
                  color: "white",
                }}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <AddMembersModal
          groupId={showAddMembersModal}
          group={groups.find((g) => g.id === showAddMembersModal)!}
          allAthletes={allAthletes}
          onClose={() => setShowAddMembersModal(null)}
          onAdd={handleAddMembers}
        />
      )}

      {/* Group Chat Modal */}
      {chatGroupId && currentUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md">
            <GroupChatPanel
              groupId={chatGroupId}
              groupName={groups.find((g) => g.id === chatGroupId)?.name || "Group"}
              groupColor={groups.find((g) => g.id === chatGroupId)?.color}
              currentUserId={currentUserId}
              isCoach={true}
              onClose={() => setChatGroupId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AddMembersModal({
  groupId,
  group,
  allAthletes,
  onClose,
  onAdd,
}: {
  groupId: string;
  group: Group;
  allAthletes: Athlete[];
  onClose: () => void;
  onAdd: (groupId: string, athleteIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const existingMemberIds = new Set(group.members.map((m) => m.athlete.id));
  const availableAthletes = allAthletes.filter((a) => !existingMemberIds.has(a.id));

  const toggleAthlete = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        className="w-full max-w-md p-6 rounded-lg max-h-[80vh] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
          border: "2px solid #3d3d4d",
        }}
      >
        <h3
          className="text-sm mb-4"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: "#4ECDC4",
            fontSize: "10px",
          }}
        >
          ADD TO {group.name.toUpperCase()}
        </h3>

        <div className="flex-1 overflow-y-auto space-y-2">
          {availableAthletes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">All athletes are already in this group</p>
          ) : (
            availableAthletes.map((athlete) => (
              <button
                key={athlete.id}
                onClick={() => toggleAthlete(athlete.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selected.has(athlete.id) ? "bg-[#4ECDC4]/20 border-[#4ECDC4]" : "bg-black/20"
                } border border-transparent hover:border-gray-600`}
              >
                {athlete.avatar_url ? (
                  <img src={athlete.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">
                    {(athlete.display_name || athlete.email)[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-white text-sm">
                    {athlete.display_name || athlete.email.split("@")[0]}
                  </p>
                  <p className="text-gray-500 text-xs">{athlete.email}</p>
                </div>
                {selected.has(athlete.id) && (
                  <div className="w-5 h-5 rounded-full bg-[#4ECDC4] flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onAdd(groupId, Array.from(selected))}
            disabled={selected.size === 0}
            className="flex-1 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(180deg, #4ECDC4 0%, #3db3ab 100%)",
              boxShadow: "0 3px 0 #2a8a84",
              color: "white",
            }}
          >
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
