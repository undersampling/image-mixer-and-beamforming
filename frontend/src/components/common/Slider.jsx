import React from "react";
import "../../styles/components.css";
import "../../styles/Slider.css";

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}) {
  return (
    <div className="slider-group">
      {label && (
        <div className="slider-label">
          <span>{label}</span>
          <span className="slider-value">
            {value}
            {unit}
          </span>
        </div>
      )}
      <input
        type="range"
        className="slider"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
