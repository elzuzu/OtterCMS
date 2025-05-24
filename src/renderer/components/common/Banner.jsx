import React from 'react';

/**
 * Simple banner component styled via CSS variables.
 * Type can be 'success', 'error', 'warning' or 'info'.
 */
export default function Banner({ type = 'info', children }) {
  return (
    <div className={`banner banner-${type}`}>{children}</div>
  );
}
