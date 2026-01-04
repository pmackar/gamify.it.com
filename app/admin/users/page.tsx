"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Crown,
  Flame,
  ExternalLink,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  main_level: number;
  current_streak: number;
  last_activity_date: string | null;
  created_at: string;
  role: "USER" | "ADMIN" | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(roleFilter !== "all" && { role: roleFilter }),
      });

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchUsers();
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  }

  function formatRelativeDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return formatDate(dateStr);
  }

  return (
    <div>
      <h1
        className="text-xl mb-6"
        style={{
          fontFamily: "var(--font-pixel)",
          color: "var(--rpg-teal)",
          fontSize: "14px",
        }}
      >
        User Management
      </h1>

      {/* Search and Filters */}
      <div
        className="p-4 rounded-lg mb-6"
        style={{
          background: "var(--rpg-card)",
          border: "1px solid var(--rpg-border)",
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--rpg-muted)" }}
            />
            <input
              type="text"
              placeholder="Search by email or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg"
              style={{
                background: "var(--rpg-darker)",
                border: "1px solid var(--rpg-border)",
                color: "var(--rpg-text)",
              }}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as "all" | "admin" | "user")
            }
            className="px-4 py-2 rounded-lg"
            style={{
              background: "var(--rpg-darker)",
              border: "1px solid var(--rpg-border)",
              color: "var(--rpg-text)",
            }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins Only</option>
            <option value="user">Users Only</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg font-medium"
            style={{
              background: "var(--rpg-teal)",
              color: "var(--rpg-bg-dark)",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--rpg-card)",
          border: "1px solid var(--rpg-border)",
        }}
      >
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--rpg-muted)" }}>
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--rpg-muted)" }}>
            No users found
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--rpg-border)" }}>
                <th
                  className="text-left p-4 text-xs font-medium"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  User
                </th>
                <th
                  className="text-left p-4 text-xs font-medium"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Role
                </th>
                <th
                  className="text-left p-4 text-xs font-medium"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Level / XP
                </th>
                <th
                  className="text-left p-4 text-xs font-medium"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Streak
                </th>
                <th
                  className="text-left p-4 text-xs font-medium"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Last Active
                </th>
                <th
                  className="text-left p-4 text-xs font-medium"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Joined
                </th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  style={{ borderBottom: "1px solid var(--rpg-border)" }}
                  className="hover:bg-white/5"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                          style={{
                            background: "var(--rpg-border)",
                            color: "var(--rpg-muted)",
                          }}
                        >
                          {(user.display_name || user.email)?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--rpg-text)" }}
                        >
                          {user.display_name || user.username || "—"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {user.role === "ADMIN" ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: "rgba(255, 215, 0, 0.2)",
                          color: "#FFD700",
                        }}
                      >
                        <Crown size={12} />
                        Admin
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                        style={{ color: "var(--rpg-muted)" }}
                      >
                        <Shield size={12} />
                        User
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm" style={{ color: "var(--rpg-gold)" }}>
                        Lvl {user.main_level}
                      </p>
                      <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                        {user.total_xp.toLocaleString()} XP
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    {user.current_streak > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-sm"
                        style={{ color: "#f97316" }}
                      >
                        <Flame size={14} />
                        {user.current_streak}d
                      </span>
                    ) : (
                      <span style={{ color: "var(--rpg-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="p-4 text-sm" style={{ color: "var(--rpg-text)" }}>
                    {formatRelativeDate(user.last_activity_date)}
                  </td>
                  <td className="p-4 text-sm" style={{ color: "var(--rpg-muted)" }}>
                    {formatDate(user.created_at)}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="p-2 rounded hover:bg-white/10 inline-flex"
                      style={{ color: "var(--rpg-teal)" }}
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            className="flex items-center justify-between p-4"
            style={{ borderTop: "1px solid var(--rpg-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                disabled={pagination.page <= 1}
                className="p-2 rounded disabled:opacity-50"
                style={{
                  background: "var(--rpg-border)",
                  color: "var(--rpg-text)",
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm" style={{ color: "var(--rpg-text)" }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded disabled:opacity-50"
                style={{
                  background: "var(--rpg-border)",
                  color: "var(--rpg-text)",
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
