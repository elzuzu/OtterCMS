import React, { useState } from 'react';

const DattaAlert = ({ type = 'info', dismissible = false, children, onClose }) => {
  const [show, setShow] = useState(true);
  if (!show) return null;

  const typeClass = `alert-${type}`;
  const iconMap = {
    success: 'feather icon-check-circle',
    danger: 'feather icon-alert-circle',
    warning: 'feather icon-alert-triangle',
    info: 'feather icon-info',
  };

  return (
    <div className={`alert ${typeClass} ${dismissible ? 'alert-dismissible' : ''} fade show`} role="alert">
      <i className={`${iconMap[type]} me-2`}></i>
      {children}
      {dismissible && (
        <button
          type="button"
          className="btn-close"
          onClick={() => {
            setShow(false);
            onClose && onClose();
          }}
        ></button>
      )}
    </div>
  );
};

export default DattaAlert;
