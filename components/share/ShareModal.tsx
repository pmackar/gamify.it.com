'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Download, Twitter, MessageCircle } from 'lucide-react';

interface ShareData {
  type: string;
  id: string;
  title: string;
  description?: string;
  icon?: string;
  shareUrl: string;
  socialText: string;
  ogImage?: string;
  user?: {
    displayName: string;
    level?: number;
  };
  // Type-specific fields
  xpReward?: number;
  exerciseCount?: number;
  totalVolume?: number;
  participantCount?: number;
  daysRemaining?: number;
}

interface ShareModalProps {
  type: 'achievement' | 'workout' | 'challenge' | 'quest';
  id: string;
  title?: string;
  onClose: () => void;
}

export default function ShareModal({ type, id, title, onClose }: ShareModalProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchShareData = async () => {
      try {
        const res = await fetch(`/api/share/${type}/${id}`);
        if (res.ok) {
          const data = await res.json();
          setShareData(data.share);
        }
      } catch (err) {
        console.error('Failed to fetch share data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [type, id]);

  const handleCopyLink = async () => {
    if (!shareData) return;
    try {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareTwitter = () => {
    if (!shareData) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.socialText)}&url=${encodeURIComponent(shareData.shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleShareWhatsApp = () => {
    if (!shareData) return;
    const url = `https://wa.me/?text=${encodeURIComponent(shareData.socialText + ' ' + shareData.shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;

    try {
      // Use html2canvas if available, otherwise just copy
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1625',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `gamify-${type}-${id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback - just copy URL
      handleCopyLink();
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'achievement':
        return 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)';
      case 'workout':
        return 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)';
      case 'challenge':
        return 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)';
      case 'quest':
        return 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)';
      default:
        return 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl overflow-hidden"
        style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--rpg-border)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--rpg-text)' }}>
            Share {title || type}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--rpg-muted)' }} />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="py-8 text-center">
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
                style={{ borderColor: 'var(--rpg-purple)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : shareData ? (
            <div className="space-y-4">
              {/* Preview Card */}
              <div
                ref={cardRef}
                className="rounded-xl overflow-hidden"
                style={{ background: '#1a1625' }}
              >
                {/* Card Header */}
                <div className="p-4" style={{ background: getGradient() }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                      {shareData.icon || '🏆'}
                    </div>
                    <div>
                      <p className="text-white/70 text-xs uppercase tracking-wide">
                        gamify.it.com
                      </p>
                      <h3 className="text-white font-bold text-lg">
                        {shareData.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {shareData.description && (
                    <p className="text-sm mb-3" style={{ color: 'var(--rpg-muted)' }}>
                      {shareData.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 flex-wrap">
                    {shareData.xpReward && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>XP Earned</p>
                        <p className="font-bold" style={{ color: 'var(--rpg-gold)' }}>+{shareData.xpReward}</p>
                      </div>
                    )}
                    {shareData.exerciseCount && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Exercises</p>
                        <p className="font-bold" style={{ color: 'var(--rpg-teal)' }}>{shareData.exerciseCount}</p>
                      </div>
                    )}
                    {shareData.totalVolume && shareData.totalVolume > 0 && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Volume</p>
                        <p className="font-bold" style={{ color: 'var(--rpg-purple)' }}>{shareData.totalVolume.toLocaleString()} lbs</p>
                      </div>
                    )}
                    {shareData.participantCount && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Competing</p>
                        <p className="font-bold" style={{ color: 'var(--rpg-text)' }}>{shareData.participantCount}</p>
                      </div>
                    )}
                  </div>

                  {/* User */}
                  {shareData.user && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--rpg-border)' }}>
                      <p className="text-sm" style={{ color: 'var(--rpg-text)' }}>
                        {shareData.user.displayName}
                        {shareData.user.level && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--rpg-purple)', color: 'white' }}>
                            LVL {shareData.user.level}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Share Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors"
                  style={{ background: 'var(--rpg-border)', color: 'var(--rpg-text)' }}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" style={{ color: 'var(--rpg-teal)' }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors"
                  style={{ background: 'var(--rpg-border)', color: 'var(--rpg-text)' }}
                >
                  <Download className="w-4 h-4" />
                  Save Image
                </button>
              </div>

              {/* Social Share */}
              <div className="flex gap-2">
                <button
                  onClick={handleShareTwitter}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors"
                  style={{ background: '#1DA1F2', color: 'white' }}
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors"
                  style={{ background: '#25D366', color: 'white' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p style={{ color: 'var(--rpg-muted)' }}>Failed to load share data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
