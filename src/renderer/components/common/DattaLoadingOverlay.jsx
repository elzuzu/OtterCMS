import React from 'react';

export default function DattaLoadingOverlay({ isLoading, message = "Chargement...", progress = null, children }) {
  return (
    <div className="position-relative">
      {children}
      {isLoading && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-75">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h6 className="mb-2">{message}</h6>
          {progress !== null && (
            <div className="progress" style={{ width: '200px' }}>
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
