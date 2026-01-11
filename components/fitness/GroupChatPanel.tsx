"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Users } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  created_at: string;
}

interface GroupChatPanelProps {
  groupId: string;
  groupName: string;
  groupColor?: string | null;
  currentUserId: string;
  isCoach: boolean;
  onClose?: () => void;
}

export default function GroupChatPanel({
  groupId,
  groupName,
  groupColor,
  currentUserId,
  isCoach,
  onClose,
}: GroupChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiBase = isCoach
    ? `/api/fitness/coach/groups/${groupId}/messages`
    : `/api/fitness/athlete/groups/${groupId}/messages`;

  // Load messages
  const loadMessages = async (before?: string) => {
    setLoading(true);
    try {
      const url = new URL(apiBase, window.location.origin);
      if (before) url.searchParams.set("before", before);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (before) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    loadMessages();
  }, [groupId]);

  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom();
    }
  }, [messages.length, loading]);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(apiBase);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch {
        // Silent fail on poll
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [apiBase]);

  const accentColor = groupColor || "#4ECDC4";

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden h-full"
      style={{
        background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
        border: "2px solid #3d3d4d",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-[#3d3d4d]"
        style={{
          background: "linear-gradient(180deg, #3d3d4d 0%, #2d2d3d 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
            }}
          >
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p
              className="text-white font-bold truncate max-w-[200px]"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}
            >
              {groupName}
            </p>
            <p className="text-gray-400 text-xs">Group Chat</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#4d4d5d] rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto min-h-0"
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-sm">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-gray-600 mb-2" />
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-500 text-xs mt-1">
              Start the group conversation!
            </p>
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={() => loadMessages(messages[0]?.created_at)}
                className="text-[#4ECDC4] text-xs text-center py-1 hover:underline"
              >
                Load older messages
              </button>
            )}
            {messages.map((msg, idx) => {
              const isOwn = msg.sender_id === currentUserId;
              const showSender =
                !isOwn &&
                (idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id);

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[75%]">
                    {showSender && (
                      <p className="text-xs text-gray-400 mb-1 ml-1">
                        {msg.sender.display_name || "Unknown"}
                      </p>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwn ? "rounded-br-none" : "rounded-bl-none"
                      }`}
                      style={{
                        background: isOwn
                          ? `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}cc 100%)`
                          : "#3d3d4d",
                        color: isOwn ? "white" : "#e0e0e0",
                      }}
                    >
                      <p className="text-sm break-words">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwn ? "text-white/70" : "text-gray-500"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#3d3d4d]">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message the group..."
            className="flex-1 bg-[#1a1a2e] border border-[#3d3d4d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none"
            style={{
              borderColor: newMessage.trim() ? accentColor : undefined
            }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: newMessage.trim()
                ? `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}cc 100%)`
                : "#3d3d4d",
              boxShadow: newMessage.trim() ? `0 2px 0 ${accentColor}66` : "none",
            }}
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
