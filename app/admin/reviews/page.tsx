'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

type ReviewStatus = 'APPROVED' | 'FLAGGED' | 'UNDER_REVIEW' | 'REJECTED' | 'SPAM';

interface ReviewFlag {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
  };
}

interface Review {
  id: string;
  title: string | null;
  content: string;
  rating: number;
  status: ReviewStatus;
  flagCount: number;
  flagReason: string | null;
  createdAt: string;
  moderatedAt: string | null;
  moderationNotes: string | null;
  author: {
    id: string;
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  location: {
    id: string;
    name: string;
    city: string | null;
  };
  flags: ReviewFlag[];
}

const STATUS_TABS: { value: ReviewStatus | 'ALL'; label: string; color: string }[] = [
  { value: 'FLAGGED', label: 'Flagged', color: 'text-red-400' },
  { value: 'UNDER_REVIEW', label: 'Under Review', color: 'text-yellow-400' },
  { value: 'APPROVED', label: 'Approved', color: 'text-green-400' },
  { value: 'REJECTED', label: 'Rejected', color: 'text-gray-400' },
  { value: 'SPAM', label: 'Spam', color: 'text-orange-400' },
  { value: 'ALL', label: 'All', color: 'text-white' },
];

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'ALL'>('FLAGGED');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [moderating, setModerating] = useState<string | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  async function fetchReviews() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Access denied');
        throw new Error('Failed to fetch reviews');
      }

      const data = await res.json();
      setReviews(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleModerate(reviewId: string, action: 'APPROVE' | 'REJECT' | 'SPAM') {
    setModerating(reviewId);

    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: moderationNotes }),
      });

      if (!res.ok) throw new Error('Failed to moderate review');

      // Remove from list or update status
      setReviews(reviews.filter((r) => r.id !== reviewId));
      setExpandedReview(null);
      setModerationNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to moderate');
    } finally {
      setModerating(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Review Moderation</h1>
        <button
          onClick={fetchReviews}
          className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? `bg-gray-700 ${tab.color} border border-gray-600`
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-lg">
          <p className="text-gray-400">No reviews found with this status.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isExpanded = expandedReview === review.id;

            return (
              <div
                key={review.id}
                className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Review header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                  onClick={() => setExpandedReview(isExpanded ? null : review.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {review.author.avatarUrl ? (
                        <Image
                          src={review.author.avatarUrl}
                          alt={review.author.username || 'User'}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-gray-400">
                            {(review.author.username || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">
                          {review.author.username || 'Anonymous'}
                        </p>
                        <p className="text-sm text-gray-400">{review.author.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Flag count */}
                      {review.flagCount > 0 && (
                        <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
                          {review.flagCount} flags
                        </span>
                      )}
                      {/* Rating */}
                      <span className="text-yellow-400">
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </span>
                      {/* Expand icon */}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Location */}
                  <p className="text-sm text-gray-400 mt-2">
                    Review for{' '}
                    <Link
                      href={`/locations/${review.location.id}`}
                      className="text-purple-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {review.location.name}
                    </Link>
                    {review.location.city && ` in ${review.location.city}`}
                  </p>

                  {/* Preview */}
                  {!isExpanded && (
                    <p className="text-gray-300 mt-2 line-clamp-2">{review.content}</p>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-700 p-4">
                    {/* Full content */}
                    {review.title && (
                      <h4 className="font-medium text-white mb-2">{review.title}</h4>
                    )}
                    <p className="text-gray-300 whitespace-pre-wrap mb-4">{review.content}</p>

                    {/* Auto-flag reason */}
                    {review.flagReason && (
                      <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm text-yellow-400">
                          <strong>Auto-flag reason:</strong> {review.flagReason}
                        </p>
                      </div>
                    )}

                    {/* User flags */}
                    {review.flags.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-400 mb-2">User Reports:</h5>
                        <div className="space-y-2">
                          {review.flags.map((flag) => (
                            <div
                              key={flag.id}
                              className="p-2 bg-gray-700/50 rounded text-sm"
                            >
                              <p className="text-gray-300">
                                <span className="text-red-400">{flag.reason}</span>
                                {' by '}
                                <span className="text-gray-400">
                                  {flag.user.username || 'Anonymous'}
                                </span>
                              </p>
                              {flag.details && (
                                <p className="text-gray-400 mt-1">{flag.details}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Moderation notes input */}
                    <div className="mb-4">
                      <label className="block text-sm text-gray-400 mb-1">
                        Moderation Notes (optional)
                      </label>
                      <textarea
                        value={moderationNotes}
                        onChange={(e) => setModerationNotes(e.target.value)}
                        placeholder="Add notes about this decision..."
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleModerate(review.id, 'APPROVE')}
                        disabled={moderating === review.id}
                        className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleModerate(review.id, 'REJECT')}
                        disabled={moderating === review.id}
                        className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleModerate(review.id, 'SPAM')}
                        disabled={moderating === review.id}
                        className="px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                      >
                        Mark as Spam
                      </button>

                      <span className="ml-auto text-xs text-gray-500">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
