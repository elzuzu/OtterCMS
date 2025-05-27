import React from 'react';
import useTheme from '../../hooks/useTheme';
import DattaButton from './DattaButton';

export default function ThemeToggle({ onThemeChange }) {
  const { mode, toggleMode } = useTheme();

  const handleToggle = () => {
    toggleMode();
    if (typeof onThemeChange === 'function') {
      onThemeChange(mode === 'light' ? 'dark' : 'light');
    }
  };

  return (
    <DattaButton
      variant="link"
      className="theme-toggle"
      onClick={handleToggle}
      aria-label="Toggle theme"
      size="sm"
    >
      <span className="theme-icon">{mode === 'light' ? '🌙' : '☀️'}</span>
    </DattaButton>
  );
}
