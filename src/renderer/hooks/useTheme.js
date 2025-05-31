import { useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

// Map the simple color ids used in the UI to Datta Able presets and main color
// value for the MUI theme. The light/dark shades are approximated.
const PRESET_CONFIG = {
  blue: {
    preset: 'preset-1',
    colors: { main: '#04a9f5', light: '#36baf7', dark: '#0387c4' }
  },
  green: {
    preset: 'preset-8',
    colors: { main: '#1de9b6', light: '#4aedc4', dark: '#17ba91' }
  },
  purple: {
    preset: 'preset-2',
    colors: { main: '#6610f2', light: '#843ff4', dark: '#510cc1' }
  },
  orange: {
    preset: 'preset-6',
    colors: { main: '#fd7e14', light: '#fd9743', dark: '#ca6410' }
  },
  red: {
    preset: 'preset-5',
    colors: { main: '#f44236', light: '#f6675e', dark: '#c3342b' }
  }
};

const applyPreset = (colorKey) => {
  const cfg = PRESET_CONFIG[colorKey];
  if (!cfg) return;
  // Apply Datta Able preset attribute
  document.documentElement.setAttribute('data-pc-preset', cfg.preset);
  // Update custom CSS variables used across the app
  const { main, light, dark } = cfg.colors;
  const root = document.documentElement;
  root.style.setProperty('--color-primary-500', main);
  root.style.setProperty('--color-primary-400', light);
  root.style.setProperty('--color-primary-300', light);
  root.style.setProperty('--color-primary-700', dark);
};

export default function useTheme() {
  const mode = 'light';
  const [color, setColor] = useState('blue');

  useEffect(() => {
    document.documentElement.setAttribute('data-layout', 'light');
    document.documentElement.classList.add('layout-light');

    const savedColor = localStorage.getItem('themePreset') || 'blue';
    setColor(savedColor);
    applyPreset(savedColor);

    const handleChange = (e) => {
      const newColor = e.detail;
      if (newColor && PRESET_CONFIG[newColor]) {
        setColor(newColor);
        applyPreset(newColor);
      }
    };
    window.addEventListener('themePresetChange', handleChange);
    return () => window.removeEventListener('themePresetChange', handleChange);
  }, []);


  const changeColor = (c) => {
    setColor(c);
    applyPreset(c);
    localStorage.setItem('themePreset', c);
    window.dispatchEvent(new CustomEvent('themePresetChange', { detail: c }));
  };

  const theme = useMemo(() => {
    const currentColorValues = PRESET_CONFIG[color]?.colors || PRESET_CONFIG.blue.colors;

    return createTheme({
      palette: {
        mode,
        primary: {
          main: currentColorValues.main,
          light: currentColorValues.light,
          dark: currentColorValues.dark,
        },
        background: {
          default: '#f4f7fa',
          paper: '#fafafa'
        },
        text: {
          primary: '#212529',
          secondary: '#4b5563'
        }
      },
      typography: { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"' }
    });
  }, [color]);

  return { color, changeColor, theme };
}
