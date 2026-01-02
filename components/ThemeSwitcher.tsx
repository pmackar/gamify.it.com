'use client';

import { useTheme } from './ThemeContext';

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const isDark = theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark');
  const isLight = theme === 'light' || (theme === 'system' && resolvedTheme === 'light');

  const toggleDarkLight = () => {
    if (theme === 'system') {
      // If on system, switch to the opposite of current resolved theme
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      // Terminal or Mario mode - toggle to dark
      setTheme('dark');
    }
  };

  return (
    <div className="theme-switcher">
      {/* Dark/Light Toggle */}
      <button
        className={`theme-toggle ${isDark ? 'dark' : 'light'}`}
        onClick={toggleDarkLight}
        title={isDark ? 'Switch to Light' : 'Switch to Dark'}
      >
        <span className="toggle-track">
          <span className="toggle-icon sun">☀️</span>
          <span className="toggle-icon moon">🌙</span>
          <span className="toggle-thumb" />
        </span>
      </button>

      {/* Auto (System) */}
      <button
        className={`theme-option ${theme === 'system' ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        title="Auto (System)"
      >
        <span className="theme-icon">💻</span>
      </button>

      {/* Terminal */}
      <button
        className={`theme-option ${theme === 'terminal' ? 'active' : ''}`}
        onClick={() => setTheme('terminal')}
        title="Terminal"
      >
        <span className="theme-icon">⌨️</span>
      </button>

      {/* Mario / NES */}
      <button
        className={`theme-option mario ${theme === 'mario' ? 'active' : ''}`}
        onClick={() => setTheme('mario')}
        title="Mario / NES"
      >
        <span className="theme-icon">🍄</span>
      </button>
    </div>
  );
}
