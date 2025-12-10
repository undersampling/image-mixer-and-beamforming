import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import './MainLayout.css';

export function MainLayout({ activeTab, onTabChange, sidebar, children }) {
  return (
    <div className="main-layout">
      <Navbar activeTab={activeTab} onTabChange={onTabChange} />
      <div className="main-content">
        {sidebar && <Sidebar>{sidebar}</Sidebar>}
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}

