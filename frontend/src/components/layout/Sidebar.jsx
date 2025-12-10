import React from 'react';
import './Sidebar.css';

export function Sidebar({ children }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {children}
      </div>
    </aside>
  );
}

