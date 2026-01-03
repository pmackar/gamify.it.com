'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isOwn: boolean;
}

interface CommentSectionProps {
  activityId: string;
  initialCount?: number;
}

export default function CommentSection({ activityId, initialCount = 0 }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (expanded && comments.length === 0) {
      fetchComments();
    }
  }, [expanded]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity/${activityId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
        setCount(data.comments.length);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/activity/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data.comment]);
        setCount(count + 1);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch(`/api/activity/${activityId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });

      if (res.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
        setCount(count - 1);
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="mt-3">
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: 'var(--rpg-muted)' }}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>{count} comment{count !== 1 ? 's' : ''}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Comments Section */}
      {expanded && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid var(--rpg-border)' }}
        >
          {loading ? (
            <div className="flex justify-center py-4">
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--rpg-purple)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : (
            <>
              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Link href={`/users/${comment.user.id}`} className="flex-shrink-0">
                      {comment.user.avatarUrl ? (
                        <Image
                          src={comment.user.avatarUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: 'linear-gradient(135deg, var(--rpg-purple) 0%, rgba(168, 85, 247, 0.7) 100%)',
                            color: 'white',
                          }}
                        >
                          {(comment.user.displayName || comment.user.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div
                        className="px-3 py-2 rounded-lg"
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--rpg-border)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Link
                            href={`/users/${comment.user.id}`}
                            className="text-xs font-medium hover:underline"
                            style={{ color: 'var(--rpg-text)' }}
                          >
                            {comment.user.displayName || comment.user.username}
                          </Link>
                          {comment.isOwn && (
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className="opacity-50 hover:opacity-100 transition-opacity"
                              style={{ color: 'var(--rpg-muted)' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--rpg-text)' }}>
                          {comment.content}
                        </p>
                      </div>
                      <p className="text-[10px] mt-1 ml-2" style={{ color: 'var(--rpg-muted)' }}>
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* New Comment Form */}
              <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  maxLength={500}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--rpg-border)',
                    color: 'var(--rpg-text)',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    background: 'var(--rpg-purple)',
                    color: 'white',
                  }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
