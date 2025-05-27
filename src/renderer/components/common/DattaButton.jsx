import React from 'react';
import Button from '@mui/material/Button';

export default function DattaButton({
  variant = 'default',
  size = 'medium',
  loading = false,
  disabled = false,
  type = 'button',
  children,
  ...props
}) {
  let muiVariant = 'contained';
  if (variant === 'text' || variant === 'link') muiVariant = 'text';
  if (variant === 'dashed') muiVariant = 'outlined';
  if (variant === 'default') muiVariant = 'outlined';
  return (
    <Button
      variant={muiVariant}
      size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'medium'}
      disabled={disabled || loading}
      type={type}
      sx={{
        textTransform: 'none',
        borderRadius: 'var(--datta-border-radius)',
        boxShadow: variant === 'primary' ? 'var(--datta-box-shadow)' : 'none',
      }}
      {...props}
    >
      {loading ? '...' : children}
    </Button>
  );
}

