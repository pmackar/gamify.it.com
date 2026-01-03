'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareModal from './ShareModal';

interface ShareButtonProps {
  type: 'achievement' | 'workout' | 'challenge' | 'quest';
  id: string;
  title?: string;
  compact?: boolean;
}

export default function ShareButton({
  type,
  id,
  title,
  compact = false,
}: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          title="Share"
        >
          <Share2 className="w-4 h-4" style={{ color: 'var(--rpg-muted)' }} />
        </button>
        {showModal && (
          <ShareModal
            type={type}
            id={id}
            title={title}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
        style={{ border: '1px solid var(--rpg-border)', color: 'var(--rpg-text)' }}
      >
        <Share2 className="w-4 h-4" />
        <span className="text-sm font-medium">Share</span>
      </button>
      {showModal && (
        <ShareModal
          type={type}
          id={id}
          title={title}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
