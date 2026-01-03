'use client';

import { useEffect, useState, useCallback } from 'react';

export interface ViewportState {
  height: number;
  visualHeight: number;
  keyboardHeight: number;
  isKeyboardOpen: boolean;
}

/**
 * Hook for detecting viewport changes and keyboard visibility.
 * Uses the visualViewport API for accurate keyboard detection on mobile.
 *
 * Desktop browsers don't trigger keyboard events, so this is effectively
 * a no-op on desktop - ensuring no impact on desktop UX.
 */
export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>({
    height: 0,
    visualHeight: 0,
    keyboardHeight: 0,
    isKeyboardOpen: false,
  });

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    const innerHeight = window.innerHeight;
    const visualHeight = vv?.height ?? innerHeight;

    // Calculate keyboard height from difference between full and visual viewport
    // Only consider it a keyboard if difference is > 150px (avoids toolbar detection)
    const heightDiff = innerHeight - visualHeight;
    const keyboardHeight = heightDiff > 150 ? heightDiff : 0;

    // Update CSS custom properties for use in CSS-only solutions
    document.documentElement.style.setProperty('--vh', `${innerHeight * 0.01}px`);
    document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);

    // Toggle keyboard class on body for CSS-based keyboard awareness
    if (keyboardHeight > 0) {
      document.body.classList.add('keyboard-open');
    } else {
      document.body.classList.remove('keyboard-open');
    }

    setState({
      height: innerHeight,
      visualHeight,
      keyboardHeight,
      isKeyboardOpen: keyboardHeight > 0,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial update
    updateViewport();

    const vv = window.visualViewport;

    // Listen to visualViewport resize (most accurate for keyboard)
    vv?.addEventListener('resize', updateViewport);

    // Also listen to window resize and focus events for redundancy
    window.addEventListener('resize', updateViewport);
    window.addEventListener('focusin', updateViewport);
    window.addEventListener('focusout', updateViewport);

    return () => {
      vv?.removeEventListener('resize', updateViewport);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('focusin', updateViewport);
      window.removeEventListener('focusout', updateViewport);
    };
  }, [updateViewport]);

  return state;
}
