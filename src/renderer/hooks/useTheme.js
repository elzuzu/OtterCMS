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
  const mode = 'light';
  const [color, setColor] = useState('blue');

  useEffect(() => {
    document.documentElement.setAttribute('data-layout', 'light');
    document.documentElement.classList.add('layout-light');

    const savedColor = localStorage.getItem('themeColor') || 'blue';
    setColor(savedColor);
    applyColor(savedColor);
  }, []);


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
