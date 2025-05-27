import React, { useRef } from 'react';

const DattaButton = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  loading = false,
  className = '',
  onClick,
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = `btn-${variant}`;
  const lightVariant = variant !== 'link' ? `btn-light-${variant}` : '';
  const btnRef = useRef(null);

  const handleClick = (e) => {
    if (!loading && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btnRef.current.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    }
    if (onClick) onClick(e);
  };

  return (
    <button
      ref={btnRef}
      className={`btn ${variantClass} ${lightVariant} ${sizeClass} ${loading ? 'disabled' : ''} ${className}`}
      disabled={loading}
      onClick={handleClick}
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

