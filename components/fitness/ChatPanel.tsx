"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, X, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  read_at: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  athlete?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  coach?: {
    id: string;
    businessName: string | null;
    user: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
}

interface ChatPanelProps {
  athleteId?: string; // For coach view - which athlete to chat with
  conversationId?: string; // Direct conversation ID
  currentUserId: string;
  isCoach: boolean;
  onClose?: () => void;
  defaultOpen?: boolean;
}

export default function ChatPanel({
  athleteId,
  conversationId: propConversationId,
  currentUserId,
  isCoach,
  onClose,
  defaultOpen = false,
}: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [conversationId, setConversationId] = useState(propConversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const apiBase = isCoach
    ? "/api/fitness/coach/messages"
    : "/api/fitness/athlete/messages";

  // Initialize or get conversation
  const initConversation = useCallback(async () => {
    if (conversationId) {
      // Load existing conversation
      await loadMessages(conversationId);
      return;
    }

    if (!athleteId || !isCoach) return;

    // Coach starting conversation with athlete
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversation.id);
        await loadMessages(data.conversation.id);
      }
    } catch (error) {
      console.error("Failed to init conversation:", error);
    }
  }, [athleteId, conversationId, isCoach, apiBase]);

  // Load messages
  const loadMessages = async (convId: string, before?: string) => {
    setLoading(true);
    try {
      const url = new URL(`${apiBase}/${convId}`, window.location.origin);
      if (before) url.searchParams.set("before", before);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
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
    if (!newMessage.trim() || !conversationId || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch(`${apiBase}/${conversationId}`, {
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
    if (isOpen) {
      initConversation();
    }
  }, [isOpen, initConversation]);

  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom();
    }
  }, [messages.length, loading]);

  // Polling for new messages
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/${conversationId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch {
        // Silent fail on poll
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, conversationId, apiBase]);

  const otherParty = isCoach
    ? conversation?.athlete
    : conversation?.coach?.user;
  const otherName =
    otherParty?.display_name ||
    (isCoach ? "Athlete" : conversation?.coach?.businessName || "Coach");

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 p-4 rounded-full shadow-lg transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(180deg, #4ECDC4 0%, #3db3ab 100%)",
          boxShadow: "0 4px 0 #2a8a84",
        }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
        border: "2px solid #3d3d4d",
        boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.4)",
        maxHeight: "70vh",
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              background: "linear-gradient(180deg, #4ECDC4 0%, #3db3ab 100%)",
              color: "white",
            }}
          >
            {otherName?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p
              className="text-white text-sm font-bold truncate max-w-[180px]"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}
            >
              {otherName}
            </p>
            <p className="text-gray-400 text-xs">
              {isCoach ? "Athlete" : "Coach"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            onClose?.();
          }}
          className="p-1 hover:bg-[#4d4d5d] rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex flex-col gap-2 p-3 overflow-y-auto"
        style={{ height: "300px" }}
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
              Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={() =>
                  conversationId &&
                  loadMessages(conversationId, messages[0]?.created_at)
                }
                className="text-[#4ECDC4] text-xs text-center py-1 hover:underline"
              >
                Load older messages
              </button>
            )}
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      isOwn ? "rounded-br-none" : "rounded-bl-none"
                    }`}
                    style={{
                      background: isOwn
                        ? "linear-gradient(180deg, #4ECDC4 0%, #3db3ab 100%)"
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
                      {isOwn && msg.read_at && " ✓✓"}
                    </p>
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
            placeholder="Type a message..."
            className="flex-1 bg-[#1a1a2e] border border-[#3d3d4d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#4ECDC4]"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: newMessage.trim()
                ? "linear-gradient(180deg, #4ECDC4 0%, #3db3ab 100%)"
                : "#3d3d4d",
              boxShadow: newMessage.trim() ? "0 2px 0 #2a8a84" : "none",
            }}
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
