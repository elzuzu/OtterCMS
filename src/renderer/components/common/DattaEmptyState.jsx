import React from 'react';

export default function DattaEmptyState({ message }) {
  return (
    <div className="text-center py-5">
      <div className="avtar avtar-xl bg-light-primary mb-4">
        <i className="ph-duotone ph-folder-notch-open f-36"></i>
      </div>
      <h5 className="mb-3">{message}</h5>
    </div>
  );
}
