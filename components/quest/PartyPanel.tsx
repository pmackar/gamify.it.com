'use client';

import { useState } from 'react';
import Image from 'next/image';
import PartyInviteModal from './PartyInviteModal';

interface PartyMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedAt: string;
  joinedAt: string | null;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
  };
}

interface Party {
  id: string;
  questId: string;
  createdAt: string;
  members: PartyMember[];
}

interface PartyPanelProps {
  questId: string;
  party: Party | null;
  isQuestOwner: boolean;
  currentUserId: string;
  questStatus: string;
  onPartyUpdate: () => void;
}

export default function PartyPanel({
  questId,
  party,
  isQuestOwner,
  currentUserId,
  questStatus,
  onPartyUpdate,
}: PartyPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const isCompleted = questStatus === 'COMPLETED';
  const acceptedMembers = party?.members.filter((m) => m.status === 'ACCEPTED') || [];
  const pendingMembers = party?.members.filter((m) => m.status === 'PENDING') || [];
  const currentMember = party?.members.find((m) => m.userId === currentUserId);
  const isPartyOwner = currentMember?.role === 'OWNER';
  const canManageParty = isQuestOwner || isPartyOwner;

  const handleCreateParty = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`/api/quests/${questId}/party`, {
        method: 'POST',
      });
      if (res.ok) {
        onPartyUpdate();
      }
    } catch (error) {
      console.error('Error creating party:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingMemberId(userId);
    try {
      const res = await fetch(`/api/quests/${questId}/party/members/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onPartyUpdate();
      }
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleLeaveParty = async () => {
    if (!confirm('Are you sure you want to leave this party?')) return;
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/quests/${questId}/party/leave`, {
        method: 'POST',
      });
      if (res.ok) {
        onPartyUpdate();
      }
    } catch (error) {
      console.error('Error leaving party:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  // No party yet - show create button for quest owner
  if (!party) {
    if (!isQuestOwner) {
      return null;
    }

    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Quest Party</h3>
        <p className="text-sm text-gray-500 mb-4">
          Create a party to invite friends and collaborate on this quest together.
        </p>
        <button
          onClick={handleCreateParty}
          disabled={isCreating || isCompleted}
          className="w-full px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Create Party
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-400">
            Party ({acceptedMembers.length}/10)
          </h3>
          {canManageParty && !isCompleted && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="text-xs px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
            >
              + Invite
            </button>
          )}
        </div>

        {/* Accepted Members */}
        <div className="space-y-2">
          {acceptedMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 bg-gray-900/50 rounded-lg"
            >
              {member.user.avatarUrl ? (
                <Image
                  src={member.user.avatarUrl}
                  alt={member.user.displayName || member.user.username || ''}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(member.user.displayName || member.user.username || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {member.user.displayName || member.user.username || 'Player'}
                  {member.role === 'OWNER' && (
                    <span className="ml-1.5 text-xs text-amber-400">Owner</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">LVL {member.user.level}</p>
              </div>
              {canManageParty && member.userId !== currentUserId && member.role !== 'OWNER' && !isCompleted && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={removingMemberId === member.userId}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                >
                  {removingMemberId === member.userId ? (
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Pending Invites */}
        {pendingMembers.length > 0 && canManageParty && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Pending Invites</p>
            <div className="space-y-2">
              {pendingMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 bg-gray-900/30 rounded-lg opacity-60"
                >
                  {member.user.avatarUrl ? (
                    <Image
                      src={member.user.avatarUrl}
                      alt={member.user.displayName || member.user.username || ''}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">
                        {(member.user.displayName || member.user.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 truncate">
                      {member.user.displayName || member.user.username}
                    </p>
                    <p className="text-xs text-amber-400">Pending...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave Party Button (non-owners only) */}
        {currentMember && currentMember.role !== 'OWNER' && !isCompleted && (
          <button
            onClick={handleLeaveParty}
            disabled={isLeaving}
            className="mt-4 w-full text-xs text-gray-500 hover:text-red-400 transition-colors py-2"
          >
            {isLeaving ? 'Leaving...' : 'Leave Party'}
          </button>
        )}
      </div>

      {isInviteModalOpen && (
        <PartyInviteModal
          questId={questId}
          existingMemberIds={party.members.map((m) => m.userId)}
          onClose={() => setIsInviteModalOpen(false)}
          onInviteSent={onPartyUpdate}
        />
      )}
    </>
  );
}
