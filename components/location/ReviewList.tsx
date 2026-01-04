'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { dispatchXPUpdate } from '@/components/XPContext';

interface Review {
  id: string;
  title: string | null;
  content: string;
  rating: number;
  helpfulCount: number;
  createdAt: string;
  author: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

interface ReviewListProps {
  locationId: string;
  currentUserId?: string;
}

const FLAG_REASONS = [
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'HARASSMENT', label: 'Harassment or hate speech' },
  { value: 'MISINFORMATION', label: 'False information' },
  { value: 'OFF_TOPIC', label: 'Not about this location' },
  { value: 'OTHER', label: 'Other' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${star <= rating ? 'text-yellow-400' : 'text-gray-600'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewList({ locationId, currentUserId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  // New review form
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({ title: '', content: '', rating: 5 });
  const [submitting, setSubmitting] = useState(false);

  // Flag modal
  const [flaggingReview, setFlaggingReview] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagDetails, setFlagDetails] = useState('');
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [locationId, sortBy]);

  async function fetchReviews() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/locations/${locationId}/reviews?sort=${sortBy}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');

      const data = await res.json();
      setReviews(data.data);
      setUserHasReviewed(data.userHasReviewed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!newReview.content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/locations/${locationId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      const data = await res.json();
      setReviews([data.data, ...reviews]);
      setNewReview({ title: '', content: '', rating: 5 });
      setShowForm(false);
      setUserHasReviewed(true);
      // Trigger XP update to show toast
      dispatchXPUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFlag() {
    if (!flaggingReview || !flagReason) return;

    setFlagging(true);
    try {
      const res = await fetch(`/api/reviews/${flaggingReview}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: flagReason, details: flagDetails }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to flag review');
      }

      setFlaggingReview(null);
      setFlagReason('');
      setFlagDetails('');
      // Show success message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag review');
    } finally {
      setFlagging(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Reviews
          {reviews.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({reviews.length})
            </span>
          )}
        </h3>

        <div className="flex items-center gap-3">
          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating">Highest Rated</option>
          </select>

          {/* Write review button */}
          {currentUserId && !userHasReviewed && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Write Review
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* New review form */}
      {showForm && (
        <form
          onSubmit={handleSubmitReview}
          className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-300 mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className={`text-2xl transition-colors ${
                    star <= newReview.rating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400/50'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Title (optional)</label>
            <input
              type="text"
              value={newReview.title}
              onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
              placeholder="Summarize your experience"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Your Review *</label>
            <textarea
              value={newReview.content}
              onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
              placeholder="Share your experience..."
              rows={4}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newReview.content.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-800 rounded-lg" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No reviews yet. Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-gray-800/30 border border-gray-700 rounded-lg p-4"
            >
              {/* Review header */}
              <div className="flex items-start justify-between mb-3">
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
                      <span className="text-gray-400 text-sm">
                        {(review.author.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">
                      {review.author.username || 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {currentUserId && currentUserId !== review.author.id && (
                  <button
                    onClick={() => setFlaggingReview(review.id)}
                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    title="Report this review"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Review content */}
              {review.title && (
                <h4 className="font-medium text-white mb-1">{review.title}</h4>
              )}
              <p className="text-gray-300 whitespace-pre-wrap">{review.content}</p>

              {/* Helpful count */}
              {review.helpfulCount > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {review.helpfulCount} {review.helpfulCount === 1 ? 'person' : 'people'} found this helpful
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Flag modal */}
      {flaggingReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Report Review</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Reason *</label>
                <div className="space-y-2">
                  {FLAG_REASONS.map((reason) => (
                    <label key={reason.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="flagReason"
                        value={reason.value}
                        checked={flagReason === reason.value}
                        onChange={(e) => setFlagReason(e.target.value)}
                        className="text-purple-500"
                      />
                      <span className="text-gray-300">{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Additional details (optional)
                </label>
                <textarea
                  value={flagDetails}
                  onChange={(e) => setFlagDetails(e.target.value)}
                  placeholder="Provide more context..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setFlaggingReview(null);
                  setFlagReason('');
                  setFlagDetails('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFlag}
                disabled={!flagReason || flagging}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {flagging ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
