import React from 'react';
import Box from '@mui/material/Box';

export default function PageWrapper({ children }) {
  return (
    <Box sx={{ p: 2 }}>{children}</Box>
  );
}
