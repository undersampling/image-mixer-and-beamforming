import React from 'react';
import '../../styles/components.css';

export function Button({ children, variant = 'primary', onClick, disabled, className = '' }) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

