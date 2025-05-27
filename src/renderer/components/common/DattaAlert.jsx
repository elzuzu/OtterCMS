import React from 'react';
import Alert from '@mui/material/Alert';

/**
 * Wrapper around MUI Alert to mimic Datta Able style.
 * Supports severity types 'success', 'error', 'warning' and 'info'.
 */
export default function DattaAlert({ type = 'info', children, ...props }) {
  return (
    <Alert
      severity={type}
      variant="filled"
      sx={{
        mb: 2,
        borderRadius: 'var(--datta-border-radius)',
        boxShadow: 'var(--datta-box-shadow)',
      }}
      {...props}
    >
      {children}
    </Alert>
  );
}
