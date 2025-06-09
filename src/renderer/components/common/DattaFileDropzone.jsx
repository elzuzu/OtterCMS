import React, { useCallback } from 'react';

export default function DattaFileDropzone({ onFiles }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    onFiles(files);
  }, [onFiles]);

  const prevent = (e) => e.preventDefault();

  return (
    <div
      onDragOver={prevent}
      onDragEnter={prevent}
      onDrop={handleDrop}
      className="border border-dashed p-3 text-center"
      style={{ cursor: 'pointer' }}
    >
      Glisser les fichiers ici
    </div>
  );
}
