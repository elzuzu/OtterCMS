import React, { useState, useEffect, createContext, useContext } from 'react';

const OperationContext = createContext();

export const useOperations = () => {
  const context = useContext(OperationContext);
  if (!context) {
    throw new Error('useOperations must be used within OperationProvider');
  }
  return context;
};

export function OperationProvider({ children }) {
  const [operations, setOperations] = useState([]);

  const addOperation = (operation) => {
    const id = Date.now() + Math.random();
    setOperations((prev) => [...prev, { ...operation, id, startTime: Date.now() }]);
    return id;
  };

  const updateOperation = (id, updates) => {
    setOperations((prev) => prev.map((op) => (op.id === id ? { ...op, ...updates } : op)));
  };

  const removeOperation = (id) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  };

  const value = {
    operations,
    addOperation,
    updateOperation,
    removeOperation,
  };

  return (
    <OperationContext.Provider value={value}>
      {children}
      <OperationQueueDisplay />
    </OperationContext.Provider>
  );
}

function OperationQueueDisplay() {
  const { operations } = useOperations();

  if (operations.length === 0) return null;

  return (
    <div
      className="position-fixed bottom-0 end-0 p-3"
      style={{ zIndex: 1040, maxWidth: '400px' }}
    >
      <div className="card shadow">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="feather icon-activity me-2"></i>
            Opérations en cours ({operations.length})
          </h6>
        </div>
        <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {operations.map((operation) => (
            <div key={operation.id} className="d-flex align-items-center mb-2">
              <div className="flex-shrink-0 me-2">
                {operation.status === 'error' ? (
                  <i className="feather icon-alert-circle text-danger"></i>
                ) : operation.status === 'completed' ? (
                  <i className="feather icon-check-circle text-success"></i>
                ) : (
                  <div className="spinner-border spinner-border-sm" role="status"></div>
                )}
              </div>
              <div className="flex-grow-1">
                <div className="small">{operation.description}</div>
                {operation.progress !== undefined && (
                  <div className="progress progress-sm">
                    <div
                      className="progress-bar"
                      style={{ width: `${operation.progress}%` }}
                    ></div>
                  </div>
                )}
                {operation.status === 'error' && (
                  <div className="text-danger small">{operation.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OperationProvider;
