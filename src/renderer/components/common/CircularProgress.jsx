import React from 'react';
import MUICircularProgress from '@mui/material/CircularProgress';
import { Typography, Box } from '@mui/material';

export default function CircularProgress({ value, label, size = 120 }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <MUICircularProgress variant="determinate" value={value} size={size} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <Typography variant="caption" component="div" color="text.secondary">
          {`${Math.round(value)}%`}
        </Typography>
        {label && (
          <Typography variant="caption" component="div">
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
