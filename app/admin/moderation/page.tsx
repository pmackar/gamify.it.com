"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface Review {
  id: string;
  title: string | null;
  content: string;
  rating: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  moderated_at: string | null;
  author: {
    id: string;
    email: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  location: {
    id: string;
    name: string;
    location_type: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ModerationPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [pagination.page, statusFilter]);

  async function fetchReviews() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/moderation/reviews?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleModerate(reviewId: string, action: "APPROVED" | "REJECTED") {
    setActionLoading(reviewId);
    try {
      const res = await fetch("/api/admin/moderation/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, action }),
      });

      if (res.ok) {
        // Remove from list since status changed
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (error) {
      console.error("Failed to moderate review:", error);
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const statusCounts = {
    PENDING: { icon: Clock, color: "#f59e0b", label: "Pending" },
    APPROVED: { icon: CheckCircle, color: "#22c55e", label: "Approved" },
    REJECTED: { icon: XCircle, color: "#ef4444", label: "Rejected" },
  };

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
        Content Moderation
      </h1>

      {/* Status Filter Tabs */}
      <div
        className="flex gap-2 mb-6 p-1 rounded-lg w-fit"
        style={{ background: "var(--rpg-card)" }}
      >
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => {
          const config = statusCounts[status];
          const Icon = config.icon;
          return (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-md transition-colors"
              style={{
                background:
                  statusFilter === status ? "var(--rpg-border)" : "transparent",
                color: statusFilter === status ? config.color : "var(--rpg-muted)",
              }}
            >
              <Icon size={16} />
              <span className="text-sm font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Reviews List */}
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
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle
              size={48}
              className="mx-auto mb-4"
              style={{ color: "var(--rpg-muted)" }}
            />
            <p style={{ color: "var(--rpg-muted)" }}>
              No {statusFilter.toLowerCase()} reviews
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--rpg-border)" }}>
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4"
                style={{ borderColor: "var(--rpg-border)" }}
              >
                <div className="flex items-start gap-4">
                  {/* Author Avatar */}
                  {review.author.avatar_url ? (
                    <img
                      src={review.author.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                      style={{
                        background: "var(--rpg-border)",
                        color: "var(--rpg-muted)",
                      }}
                    >
                      {(
                        review.author.display_name || review.author.email
                      )?.[0]?.toUpperCase()}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--rpg-text)" }}
                      >
                        {review.author.display_name ||
                          review.author.username ||
                          review.author.email}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--rpg-muted)" }}
                      >
                        •
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--rpg-muted)" }}
                      >
                        {formatDate(review.created_at)}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} style={{ color: "var(--rpg-teal)" }} />
                      <Link
                        href={`/travel/locations/${review.location.id}`}
                        className="text-sm hover:underline"
                        style={{ color: "var(--rpg-teal)" }}
                      >
                        {review.location.name}
                      </Link>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: "var(--rpg-border)",
                          color: "var(--rpg-muted)",
                        }}
                      >
                        {review.location.location_type}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          fill={star <= review.rating ? "#FFD700" : "transparent"}
                          style={{
                            color: star <= review.rating ? "#FFD700" : "var(--rpg-border)",
                          }}
                        />
                      ))}
                      <span
                        className="ml-2 text-sm"
                        style={{ color: "var(--rpg-muted)" }}
                      >
                        {review.rating.toFixed(1)}
                      </span>
                    </div>

                    {/* Review Title */}
                    {review.title && (
                      <p
                        className="font-medium mb-1"
                        style={{ color: "var(--rpg-text)" }}
                      >
                        {review.title}
                      </p>
                    )}

                    {/* Review Content */}
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--rpg-text)" }}
                    >
                      {review.content}
                    </p>
                  </div>

                  {/* Actions */}
                  {statusFilter === "PENDING" && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleModerate(review.id, "APPROVED")}
                        disabled={actionLoading === review.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        style={{
                          background: "rgba(34, 197, 94, 0.2)",
                          color: "#22c55e",
                        }}
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleModerate(review.id, "REJECTED")}
                        disabled={actionLoading === review.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        style={{
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#ef4444",
                        }}
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </div>
                  )}

                  {statusFilter !== "PENDING" && (
                    <div className="flex-shrink-0">
                      <Link
                        href={`/travel/locations/${review.location.id}`}
                        className="p-2 rounded hover:bg-white/10 inline-flex"
                        style={{ color: "var(--rpg-teal)" }}
                      >
                        <ExternalLink size={16} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
              {pagination.total} reviews
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
