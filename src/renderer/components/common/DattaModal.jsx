import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconX } from '@tabler/icons-react';

export default function DattaModal({
  open,
  onClose,
  title,
  size = 'medium',
  hideCloseButton = false,
  footer,
  children,
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) onClose && onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="datta-modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={`datta-modal size-${size}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {(title || !hideCloseButton) && (
              <div className="datta-modal-header">
                {title && <h2 className="datta-modal-title">{title}</h2>}
                {!hideCloseButton && (
                  <button className="datta-modal-close" aria-label="Fermer" onClick={onClose}>
                    <IconX size={20} />
                  </button>
                )}
              </div>
            )}
            <div className="datta-modal-body">{children}</div>
            {footer && <div className="datta-modal-footer">{footer}</div>}
          </motion.div>
          <style jsx>{`
            .datta-modal-backdrop {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: rgba(0, 0, 0, 0.5);
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
            }
            .datta-modal {
              background-color: var(--current-surface-color);
              border-radius: var(--datta-border-radius);
              box-shadow: var(--datta-box-shadow);
              display: flex;
              flex-direction: column;
              width: 100%;
              max-height: 90vh;
              overflow: hidden;
            }
            .size-small { max-width: 400px; }
            .size-medium { max-width: 600px; }
            .size-large { max-width: 800px; }
            .size-full { max-width: 95%; height: 95%; }
            .datta-modal-header {
              display: flex;
              align-items: center;
              padding: var(--spacing-4);
              border-bottom: 1px solid var(--current-border-light);
            }
            .datta-modal-title {
              flex: 1;
              margin: 0;
              font-size: 1.25rem;
            }
            .datta-modal-close {
              background: none;
              border: none;
              padding: 4px;
              border-radius: 4px;
              color: var(--current-text-secondary);
              cursor: pointer;
              transition: background-color 0.2s ease, color 0.2s ease;
            }
            .datta-modal-close:hover {
              background-color: var(--current-border-light);
              color: var(--current-danger-color);
            }
            .datta-modal-body {
              padding: var(--spacing-4);
              overflow-y: auto;
              flex: 1;
            }
            .datta-modal-footer {
              padding: var(--spacing-3) var(--spacing-4);
              border-top: 1px solid var(--current-border-light);
              display: flex;
              justify-content: flex-end;
              gap: var(--spacing-2);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
