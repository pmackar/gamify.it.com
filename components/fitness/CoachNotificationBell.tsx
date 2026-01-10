"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Check, CheckCheck, Trash2 } from "lucide-react";
import { coaching_notification_type } from "@prisma/client";

interface CoachingNotification {
  id: string;
  type: coaching_notification_type;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
  sender: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const notificationIcons: Record<coaching_notification_type, string> = {
  WORKOUT_REMINDER: "🏋️",
  WORKOUT_COMPLETED: "✅",
  PROGRAM_UPDATED: "📝",
  PROGRAM_ASSIGNED: "📋",
  COACH_MESSAGE: "💬",
  ATHLETE_MESSAGE: "💬",
  PR_CELEBRATION: "🎉",
  STREAK_WARNING: "⚠️",
  CHECK_IN_DUE: "📊",
  FORM_CHECK_READY: "🎥",
};

export default function CoachNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CoachingNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fitness/coach/notifications?limit=15");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/fitness/coach/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/fitness/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/fitness/coach/notifications/${id}`, { method: "DELETE" });
      const wasUnread = notifications.find((n) => n.id === id)?.read === false;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-400" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{
              background: "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden rounded-lg z-50"
          style={{
            background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
            border: "2px solid #3d3d4d",
            boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#3d3d4d]">
            <h3
              className="text-xs"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#FFD700",
                fontSize: "10px",
              }}
            >
              NOTIFICATIONS
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#4ECDC4] hover:bg-white/10 rounded transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Read all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-[#3d3d4d] hover:bg-white/5 transition-colors ${
                    !notification.read ? "bg-[#4ECDC4]/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="text-xl flex-shrink-0">
                      {notificationIcons[notification.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${
                            notification.read ? "text-gray-400" : "text-white"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {notification.body}
                      </p>
                      {notification.sender && (
                        <p className="text-xs text-gray-600 mt-1">
                          From: {notification.sender.display_name || "User"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 hover:bg-white/10 rounded text-[#4ECDC4]"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
