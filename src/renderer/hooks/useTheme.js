import { useMemo } from 'react';

export default function useTheme() {
  const color = 'blue';
  const changeColor = () => {};

  const theme = useMemo(() => ({
    primary: '#04a9f5',
    background: '#f4f7fa',
    textPrimary: '#212529'
  }), []);

  return { color, changeColor, theme };
}
