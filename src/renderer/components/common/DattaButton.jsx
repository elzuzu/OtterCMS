import React from 'react';

export default function DattaButton({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  type = 'button',
  children,
  ...props
}) {
  const sizeClass = size === 'large' ? 'btn-lg' : size === 'small' ? 'btn-sm' : '';
  const className = `btn btn-${variant} ${sizeClass}`;
  return (
    <button className={className} disabled={disabled || loading} type={type} {...props}>
      {loading ? '...' : children}
    </button>
  );
}

