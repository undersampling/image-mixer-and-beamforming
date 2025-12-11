import React from "react";
import "../../styles/components.css";
import "../../styles/Toggle.css";

export function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle-group">
      <span className="toggle-label">{label}</span>
      <span className="toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </span>
    </label>
  );
}
