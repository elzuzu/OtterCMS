import { useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

export default function useTheme() {
  const color = 'blue';
  const changeColor = () => {};

  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: 'light',
        primary: {
          main: '#04a9f5',
          light: '#36baf7',
          dark: '#0387c4'
        },
        background: { default: '#f4f7fa', paper: '#fafafa' },
        text: { primary: '#212529', secondary: '#4b5563' }
      },
      typography: {
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
      }
    });
  }, []);

  return { color, changeColor, theme };
}
