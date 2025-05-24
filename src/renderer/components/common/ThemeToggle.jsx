import React, { useState, useEffect } from 'react';

export default function ThemeToggle({ onThemeChange }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (typeof onThemeChange === 'function') {
      onThemeChange(newTheme);
    }
  };

  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
      <span className="theme-icon">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
