import React from "react";
import "../../styles/components.css";

export function Dropdown({
  label,
  value,
  onChange,
  options = [],
  className = "",
  placeholder = "Select an option...",
}) {
  // Ensure options is an array
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className={`dropdown-group ${className}`}>
      {label && <label className="label">{label}</label>}
      <select
        className="dropdown"
        value={value || ""}
        onChange={(e) => {
          const selectedValue = e.target.value;
          if (selectedValue && onChange) {
            onChange(selectedValue);
          }
        }}
      >
        {!value && placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {safeOptions.length === 0 ? (
          <option value="" disabled>
            No options available
          </option>
        ) : (
          safeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
