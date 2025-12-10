import React from 'react';
import '../../styles/components.css';

export function LoadingSpinner({ size = 40 }) {
  return (
    <div className="spinner-container">
      <div className="spinner" style={{ width: size, height: size }}></div>
    </div>
  );
}

