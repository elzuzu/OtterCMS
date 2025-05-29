import { useState, useEffect, useMemo } from 'react';
// createTheme from MUI is used for consistent theme generation
import { createTheme } from '@mui/material/styles';

const COLORS = ['blue', 'green', 'purple', 'orange', 'red'];

// Define actual color values for MUI theme
const COLOR_VALUES = {
  blue: {
    main: '#1890ff',
    light: '#40a9ff', 
    dark: '#096dd9'
  },
  green: {
    main: '#52c41a',
    light: '#73d13d',
    dark: '#389e0d'
  },
  purple: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed'
  },
  orange: {
    main: '#faad14',
    light: '#ffc53d',
    dark: '#d48806'
  },
  red: {
    main: '#ff4d4f',
    light: '#ff7875',
    dark: '#cf1322'
  }
};

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
          document.documentElement.setAttribute('data-layout', saved);
          document.documentElement.classList.remove('layout-light', 'layout-dark');
          document.documentElement.classList.add(`layout-${saved}`);
        } else {
          const saved = localStorage.getItem('theme') || 'dark';
          setMode(saved);
          document.documentElement.setAttribute('data-layout', saved);
          document.documentElement.classList.remove('layout-light', 'layout-dark');
          document.documentElement.classList.add(`layout-${saved}`);
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
    document.documentElement.setAttribute('data-layout', newMode);
    document.documentElement.classList.remove('layout-light', 'layout-dark');
    document.documentElement.classList.add(`layout-${newMode}`);
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

  const theme = useMemo(() => {
    const currentColorValues = COLOR_VALUES[color] || COLOR_VALUES.blue;
    
    return createTheme({
      palette: {
        mode,
        primary: {
          main: currentColorValues.main,
          light: currentColorValues.light,
          dark: currentColorValues.dark,
        },
        background: {
          default: mode === 'light' ? '#f4f7fa' : '#161c2d', // Default background remains as it's not specified for cards
          paper: mode === 'light' ? '#fafafa' : '#001529' // Card background from style guide
        },
        text: {
          primary: mode === 'light' ? '#212529' : 'rgba(255, 255, 255, 0.87)',
          secondary: mode === 'light' ? '#4b5563' : 'rgba(255, 255, 255, 0.6)'
        }
      },
      typography: { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"' }
    });
  }, [mode, color]);

  return { mode, color, toggleMode, changeColor, theme };
}
