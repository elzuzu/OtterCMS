import React from 'react';

const DattaButton = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  loading = false,
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = `btn-${variant}`;
  const lightVariant = variant !== 'link' ? `btn-light-${variant}` : '';

  return (
    <button
      className={`btn ${variantClass} ${lightVariant} ${sizeClass} ${loading ? 'disabled' : ''}`}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
      ) : icon ? (
        <i className={`${icon} me-2`}></i>
      ) : null}
      {children}
    </button>
  );
};

export default DattaButton;

