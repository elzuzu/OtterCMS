import React, { useState, useEffect } from 'react';

export default function ThemeToggle({ onThemeChange }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const load = async () => {
      try {
        if (window.api && window.api.getTheme) {
          const result = await window.api.getTheme();
          const savedTheme = result?.theme || 'dark';
          setTheme(savedTheme);
          document.documentElement.setAttribute('data-theme', savedTheme);
          if (typeof onThemeChange === 'function') {
            onThemeChange(savedTheme);
          }
        } else {
          const savedTheme = localStorage.getItem('theme') || 'dark';
          setTheme(savedTheme);
          document.documentElement.setAttribute('data-theme', savedTheme);
        }
      } catch (err) {
        console.error('ThemeToggle: load theme failed', err);
      }
    };
    load();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (window.api && window.api.setTheme) {
      try { await window.api.setTheme(newTheme); } catch (e) { console.error(e); }
    } else {
      localStorage.setItem('theme', newTheme);
    }
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
