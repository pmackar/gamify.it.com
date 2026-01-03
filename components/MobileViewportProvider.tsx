'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useViewport, ViewportState } from '@/hooks/useViewport';

/**
 * Context for sharing viewport state across the app.
 * Provides keyboard height and visibility information for mobile-optimized UIs.
 */
const ViewportContext = createContext<ViewportState>({
  height: 0,
  visualHeight: 0,
  keyboardHeight: 0,
  isKeyboardOpen: false,
});

interface MobileViewportProviderProps {
  children: ReactNode;
}

/**
 * Provider component that tracks viewport and keyboard state.
 *
 * Usage:
 * 1. Wrap your app with <MobileViewportProvider>
 * 2. Use useViewportContext() in components that need keyboard awareness
 *
 * On desktop, keyboard state is always false/0, so components work normally.
 */
export function MobileViewportProvider({ children }: MobileViewportProviderProps) {
  const viewport = useViewport();

  return (
    <ViewportContext.Provider value={viewport}>
      {children}
    </ViewportContext.Provider>
  );
}

/**
 * Hook to access viewport state from any component.
 *
 * Returns:
 * - height: Full window inner height
 * - visualHeight: Visible viewport height (smaller when keyboard open)
 * - keyboardHeight: Height of virtual keyboard (0 on desktop)
 * - isKeyboardOpen: Boolean for keyboard visibility
 */
export function useViewportContext(): ViewportState {
  return useContext(ViewportContext);
}

/**
 * Convenience hook for just keyboard height.
 */
export function useKeyboardHeight(): number {
  const { keyboardHeight } = useContext(ViewportContext);
  return keyboardHeight;
}

/**
 * Convenience hook for keyboard open state.
 */
export function useIsKeyboardOpen(): boolean {
  const { isKeyboardOpen } = useContext(ViewportContext);
  return isKeyboardOpen;
}

/**
 * Helper to scroll an input element into view when focused.
 * Call this in onFocus handlers for inputs that might be covered by keyboard.
 */
export function scrollInputIntoView(element: HTMLElement | null) {
  if (!element) return;

  // Small delay to let keyboard animate in
  setTimeout(() => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, 300);
}
