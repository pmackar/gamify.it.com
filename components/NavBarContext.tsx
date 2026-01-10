'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface NavBarContextValue {
  centerContent: ReactNode | null;
  setCenterContent: (content: ReactNode | null) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  showLogo: boolean;
  setShowLogo: (show: boolean) => void;
}

const NavBarContext = createContext<NavBarContextValue | null>(null);

export function NavBarProvider({ children }: { children: ReactNode }) {
  const [centerContent, setCenterContent] = useState<ReactNode | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showLogo, setShowLogo] = useState(true);

  return (
    <NavBarContext.Provider value={{ centerContent, setCenterContent, theme, setTheme, showLogo, setShowLogo }}>
      {children}
    </NavBarContext.Provider>
  );
}

export function useNavBar() {
  const context = useContext(NavBarContext);
  if (!context) {
    throw new Error('useNavBar must be used within a NavBarProvider');
  }
  return context;
}

export function useNavBarContent() {
  const context = useContext(NavBarContext);
  return context?.centerContent ?? null;
}

export function useNavBarTheme() {
  const context = useContext(NavBarContext);
  return context?.theme ?? 'dark';
}

export function useNavBarLogo() {
  const context = useContext(NavBarContext);
  return context?.showLogo ?? true;
}
