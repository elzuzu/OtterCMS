import React from 'react';
import { Card, CardHeader, CardContent } from '@mui/material';

export default function DattaCard({ title, actions, children, sx, ...props }) {
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        boxShadow: 'var(--datta-box-shadow)',
        borderRadius: 'var(--datta-border-radius)',
        backgroundColor: 'var(--datta-card-bg)',
        ...sx,
      }}
      {...props}
    >
      {title && <CardHeader title={title} action={actions} sx={{ pb: 0 }} />}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
