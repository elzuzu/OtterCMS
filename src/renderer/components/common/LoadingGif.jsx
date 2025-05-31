import React from 'react';

export default function LoadingGif({ 
  src = '/images/animations/loading.gif', 
  alt = 'Chargement...', 
  size = 'medium',
  className = '' 
}) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  return (
    <div className={`d-flex align-items-center justify-content-center ${className}`}>
      <img
        src={src}
        alt={alt}
        className={sizeClasses[size] || sizeClasses.medium}
        style={{
          display: 'block',
          animation: 'none',
          maxWidth: '100%',
          height: 'auto'
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          console.warn(`GIF non trouvé: ${src}`);
        }}
      />
    </div>
  );
}
