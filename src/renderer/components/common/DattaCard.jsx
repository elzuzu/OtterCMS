import React from 'react';
import { Card } from '@mui/material';

export default function DattaCard({ children, sx, ...props }) {
  return (
    <Card variant="outlined" sx={{ mb: 2, ...sx }} {...props}>
      {children}
    </Card>
  );
}
