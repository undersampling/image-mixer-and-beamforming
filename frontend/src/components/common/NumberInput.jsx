import React from "react";
import "../../styles/components.css";
import "../../styles/NumberInput.css";

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = "",
  className = "",
}) {
  return (
    <div className={`number-input-group ${className}`}>
      {label && <label className="label">{label}</label>}
      <div className="number-input-wrapper">
        <input
          type="number"
          className="input"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
        />
        {unit && <span className="input-unit">{unit}</span>}
      </div>
    </div>
  );
}
