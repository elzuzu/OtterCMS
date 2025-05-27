import { useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

const COLORS = ['blue', 'green', 'purple', 'orange', 'red'];

const applyColor = (color) => {
  COLORS.forEach((c) => document.body.classList.remove('theme-' + c));
  document.body.classList.add('theme-' + color);
};

export default function useTheme() {
  const [mode, setMode] = useState('dark');
  const [color, setColor] = useState('blue');

  useEffect(() => {
    async function load() {
      try {
        if (window.api && window.api.getTheme) {
          const res = await window.api.getTheme();
          const saved = res?.theme || 'dark';
          setMode(saved);
          document.documentElement.setAttribute('data-theme', saved);
        } else {
          const saved = localStorage.getItem('theme') || 'dark';
          setMode(saved);
          document.documentElement.setAttribute('data-theme', saved);
        }
      } catch (e) {
        console.error('useTheme: load theme failed', e);
      }

      const savedColor = localStorage.getItem('themeColor') || 'blue';
      setColor(savedColor);
      applyColor(savedColor);
    }
    load();
  }, []);

  const toggleMode = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    document.documentElement.setAttribute('data-theme', newMode);
    if (window.api && window.api.setTheme) {
      try { await window.api.setTheme(newMode); } catch (e) { console.error(e); }
    } else {
      localStorage.setItem('theme', newMode);
    }
  };

  const changeColor = (c) => {
    setColor(c);
    applyColor(c);
    localStorage.setItem('themeColor', c);
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: 'var(--current-primary-color)' },
      background: {
        default: 'var(--current-background-color)',
        paper: 'var(--current-surface-color)'
      },
      text: {
        primary: 'var(--current-text-primary)',
        secondary: 'var(--current-text-secondary)'
      }
    },
    typography: { fontFamily: 'var(--font-family-base)' }
  }), [mode]);

  return { mode, color, toggleMode, changeColor, theme };
}
