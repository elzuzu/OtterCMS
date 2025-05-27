import React from 'react';
import useTheme from '../../hooks/useTheme';

export default function ThemeToggle({ onThemeChange }) {
  const { mode, toggleMode } = useTheme();

  const handleToggle = () => {
    toggleMode();
    if (typeof onThemeChange === 'function') {
      onThemeChange(mode === 'light' ? 'dark' : 'light');
    }
  };

  return (
    <button className="theme-toggle" onClick={handleToggle} aria-label="Toggle theme">
      <span className="theme-icon">{mode === 'light' ? '🌙' : '☀️'}</span>
    </button>
  );
}
