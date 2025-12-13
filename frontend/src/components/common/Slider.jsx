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
  // Local state for immediate UI feedback (smooth dragging)
  const [localValue, setLocalValue] = React.useState(value);

  // Sync local state if the parent value changes externally
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue); // Update visual slider immediately
    onChange(newValue);      // Trigger simulation update immediately
  };

  return (
    <div className="slider-group">
      {label && (
        <div className="slider-label">
          <span>{label}</span>
          <span className="slider-value">
            {localValue}
            {unit}
          </span>
        </div>
      )}
      <input
        type="range"
        className="slider"
        value={localValue}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}