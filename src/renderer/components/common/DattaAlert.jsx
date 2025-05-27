import React, { useEffect, useState } from 'react';

/**
 * DattaAble style alert component.
 * Supports optional auto close and smooth dismiss animation.
 *
 * @param {Object} props
 * @param {string} [props.type='info'] - Alert visual style (primary, secondary, success, danger, warning, info, light, dark)
 * @param {boolean} [props.dismissible=false] - Whether the alert can be dismissed manually
 * @param {React.ReactNode} props.children - Content of the alert
 * @param {function} [props.onClose] - Callback invoked when the alert is closed
 * @param {number} [props.autoClose] - Auto close delay in seconds
 */
const DattaAlert = ({ type = 'info', dismissible = false, children, onClose, autoClose }) => {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (autoClose && autoClose > 0) {
      const timer = setTimeout(() => handleClose(), autoClose * 1000);
      return () => clearTimeout(timer);
    }
  }, [autoClose]);

  const handleClose = () => {
    // trigger fade-out animation before removing the alert
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      onClose && onClose();
    }, 300); // duration should match CSS fade time
  };

  if (!visible) return null;

  const typeClass = `alert-${type}`;
  const iconMap = {
    success: 'feather icon-check-circle',
    danger: 'feather icon-alert-circle',
    warning: 'feather icon-alert-triangle',
    info: 'feather icon-info',
    primary: 'feather icon-info',
    secondary: 'feather icon-info',
    light: 'feather icon-info',
    dark: 'feather icon-info',
    error: 'feather icon-alert-circle'
  };

  const iconClass = iconMap[type] || iconMap.info;

  return (
    <div
      className={`alert ${typeClass} ${dismissible ? 'alert-dismissible' : ''} fade ${closing ? '' : 'show'}`}
      role="alert"
    >
      <i className={`${iconClass} me-2`}></i>
      {children}
      {dismissible && (
        <button type="button" className="btn-close" onClick={handleClose}></button>
      )}
    </div>
  );
};

export default DattaAlert;
