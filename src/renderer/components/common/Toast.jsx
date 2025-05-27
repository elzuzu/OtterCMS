import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconCircleCheck, IconAlertCircle, IconInfoCircle, IconX } from '@tabler/icons-react';

export default function Toast({ toasts, removeToast }) {
  const icons = {
    success: <IconCircleCheck size={20} />,
    error: <IconAlertCircle size={20} />,
    info: <IconInfoCircle size={20} />,
  };

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="toast-icon">{icons[toast.type]}</div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <IconX size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
