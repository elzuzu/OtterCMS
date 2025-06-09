import React from 'react';

const DattaModal = ({
  open,
  onClose,
  title,
  size = 'md',
  centered = false,
  scrollable = false,
  footer,
  children,
}) => {
  const sizeClass = ['sm', 'lg', 'xl'].includes(size) ? `modal-${size}` : '';
  const dialogClass = `modal-dialog ${sizeClass} ${centered ? 'modal-dialog-centered' : ''} ${
    scrollable ? 'modal-dialog-scrollable' : ''
  }`;

  return (
    <>
      <div
        className={`modal fade ${open ? 'show' : ''}`}
        style={{ display: open ? 'block' : 'none' }}
      >
        <div className={dialogClass}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      {open && <div className="modal-backdrop fade show" onClick={onClose}></div>}
    </>
  );
};

export default DattaModal;
