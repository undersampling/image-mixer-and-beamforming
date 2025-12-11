import React, { useState } from 'react';
import '../../styles/card.css';

export function Card({ title, icon, children, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="card">
      <div 
        className={`card-header ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="card-header-content">
          {icon && <span className="card-icon">{icon}</span>}
          <h3 className="card-title">{title}</h3>
        </div>
        <div className="card-toggle">
          <span className="card-toggle-icon">▼</span>
        </div>
      </div>
      <div className={`card-body ${isExpanded ? 'expanded' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// If you were using a different Card component before, 
// you can also export it as default:
export default Card;