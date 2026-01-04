"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY_DISMISSED = "pwa-banner-dismissed";
const STORAGE_KEY_DISMISS_COUNT = "pwa-banner-dismiss-count";
const DISMISS_DURATION_DAYS = 7;
const MAX_DISMISSALS = 3;

interface PWAInstallState {
  shouldShowBanner: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  isMobile: boolean;
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
  dismissBanner: () => void;
  completeTutorial: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [mounted, setMounted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Start dismissed until we check

  // Platform detection
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Detect platform
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const android = /Android/i.test(ua);
    const mobile = ios || android ||
      (window.innerWidth <= 768 && 'ontouchstart' in window);

    // Detect PWA mode
    const pwa = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsIOS(ios);
    setIsAndroid(android);
    setIsMobile(mobile);
    setIsPWA(pwa);

    // Check dismissal status
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
      const dismissCount = parseInt(localStorage.getItem(STORAGE_KEY_DISMISS_COUNT) || "0", 10);

      // Permanently dismissed after MAX_DISMISSALS
      if (dismissCount >= MAX_DISMISSALS) {
        setDismissed(true);
        return;
      }

      // Temporarily dismissed
      if (dismissedAt) {
        const dismissedDate = new Date(parseInt(dismissedAt, 10));
        const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceDismissed < DISMISS_DURATION_DAYS) {
          setDismissed(true);
          return;
        }
      }

      // Not dismissed
      setDismissed(false);
    } catch {
      // localStorage not available (private browsing)
      setDismissed(true);
    }
  }, []);

  const dismissBanner = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, Date.now().toString());
      const currentCount = parseInt(localStorage.getItem(STORAGE_KEY_DISMISS_COUNT) || "0", 10);
      localStorage.setItem(STORAGE_KEY_DISMISS_COUNT, (currentCount + 1).toString());
    } catch {
      // localStorage not available
    }
    setDismissed(true);
  }, []);

  const completeTutorial = useCallback(() => {
    // Mark as permanently completed (like max dismissals)
    try {
      localStorage.setItem(STORAGE_KEY_DISMISS_COUNT, MAX_DISMISSALS.toString());
    } catch {
      // localStorage not available
    }
    setShowTutorial(false);
    setDismissed(true);
  }, []);

  // Show banner only if:
  // - Component is mounted (client-side)
  // - User is on mobile
  // - User is NOT in PWA mode
  // - User has not dismissed
  const shouldShowBanner = mounted && isMobile && !isPWA && !dismissed;

  return {
    shouldShowBanner,
    isIOS,
    isAndroid,
    isPWA,
    isMobile,
    showTutorial,
    setShowTutorial,
    dismissBanner,
    completeTutorial,
  };
}
