'use client';

import { useTheme, Theme } from './ThemeContext';

const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'system', label: 'AUTO', icon: '💻' },
  { id: 'dark', label: 'DARK', icon: '🌙' },
  { id: 'light', label: 'LIGHT', icon: '☀️' },
  { id: 'terminal', label: 'TERM', icon: '⌨️' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher">
      {THEMES.map((t) => (
        <button
          key={t.id}
          className={`theme-option ${theme === t.id ? 'active' : ''}`}
          onClick={() => setTheme(t.id)}
          title={t.label}
        >
          <span className="theme-icon">{t.icon}</span>
        </button>
      ))}
    </div>
  );
}
