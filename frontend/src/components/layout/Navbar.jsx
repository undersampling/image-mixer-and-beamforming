import React from 'react';
import './Navbar.css';

export function Navbar({ activeTab, onTabChange }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🎯</span>
        <span className="navbar-title">Signal Processing Lab</span>
      </div>
      <div className="navbar-tabs">
        <button
          className={`navbar-tab ${activeTab === 'parta' ? 'active' : ''}`}
          onClick={() => onTabChange('parta')}
        >
          Part A
        </button>
        <button
          className={`navbar-tab ${activeTab === 'partb' ? 'active' : ''}`}
          onClick={() => onTabChange('partb')}
        >
          Part B <span className="active-indicator">●</span>
        </button>
      </div>
    </nav>
  );
}

