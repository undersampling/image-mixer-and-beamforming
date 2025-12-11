import React from "react";
import { Sidebar } from "./Sidebar";
import "../../styles/MainLayout.css";

export function MainLayout({ sidebar, children }) {
  return (
    <div className="main-layout">
      <div className="main-content">
        {sidebar && <Sidebar>{sidebar}</Sidebar>}
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
