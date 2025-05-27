import React from 'react';

const DattaModal = ({ open, onClose, title, size = 'md', centered = false, footer, children }) => {
  if (!open) return null;

  const dialogClass = `modal-dialog modal-${size} ${centered ? 'modal-dialog-centered' : ''}`;

  return (
    <>
      <div className={`modal fade show`} style={{ display: 'block' }}>
        <div className={dialogClass}>
          <div className="modal-content">
            {title && (
              <div className="modal-header">
                <h5 className="modal-title">{title}</h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
            )}
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose}></div>
    </>
  );
};

export default DattaModal;
