import React, { useState } from "react";
import { useSimulator } from "../../../context/SimulatorContext";
import { Card } from "../../common/Card";
import { Button } from "../../common/Button";
import { Slider } from "../../common/Slider";
import { NumberInput } from "../../common/NumberInput";
import { Toggle } from "../../common/Toggle";
import { Dropdown } from "../../common/Dropdown";
import "../../../styles/ArrayManager.css";

export function ArrayManager() {
  const { config, updateArray, addArray, removeArray } = useSimulator();
  const [expandedArray, setExpandedArray] = useState(null);

  if (!config || !config.arrays) return null;

  const handleAddArray = () => {
    const newId = `array_${Date.now()}`;
    addArray({
      id: newId,
      name: `Array ${config.arrays.length + 1}`,
      type: "linear",
      num_elements: 16,
      element_spacing: 0.05,
      frequencies: [5000],
      steering_angle: 0,
      focus_point: null,
      position: { x: 0, y: 0 },
      rotation: 0,
    });
    setExpandedArray(newId);
  };

  const handleArrayChange = (arrayId, updates) => {
    updateArray(arrayId, updates);
  };

  return (
    <Card title="Phased Arrays" defaultExpanded={true}>
      <Button
        variant="primary"
        onClick={handleAddArray}
        style={{ marginTop: "1rem", marginBottom: "3px", width: "100%" }}
      >
        + Add Array
      </Button>

      {config.arrays.map((array, idx) => (
        <ArrayConfig
          key={array.id}
          array={array}
          index={idx}
          isExpanded={expandedArray === array.id}
          onExpand={() =>
            setExpandedArray(expandedArray === array.id ? null : array.id)
          }
          onChange={(updates) => handleArrayChange(array.id, updates)}
          onDelete={() => {
            if (window.confirm("Delete this array?")) {
              removeArray(array.id);
              if (expandedArray === array.id) {
                setExpandedArray(null);
              }
            }
          }}
        />
      ))}
    </Card>
  );
}

function ArrayConfig({
  array,
  index,
  isExpanded,
  onExpand,
  onChange,
  onDelete,
}) {
  const [freqMode, setFreqMode] = useState(
    Array.isArray(array.frequencies) && array.frequencies.length > 1
      ? "range"
      : "individual"
  );
  const [useFocus, setUseFocus] = useState(array.focus_point !== null);

  const handleFreqModeChange = (mode) => {
    setFreqMode(mode);
    if (mode === "individual") {
      onChange({
        frequencies:
          array.frequencies.length > 0 ? [array.frequencies[0]] : [5000],
      });
    } else {
      const first = array.frequencies[0] || 1000;
      onChange({ frequencies: [first, first + 1000, first + 2000] });
    }
  };

  return (
    <div className="array-config">
      <div className="array-header" onClick={onExpand}>
        <span>
          {isExpanded ? "▼" : "►"} Array {index + 1}: ({array.type},
          {array.num_elements}elements)
        </span>
        <button
          className="btn btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }}
        >
          🗑
        </button>
      </div>

      {isExpanded && (
        <div className="array-content">
          <div className="section-title">Geometry</div>
          <Dropdown
            label="Type"
            value={array.type}
            onChange={(val) => onChange({ type: val })}
            options={[
              { value: "linear", label: "Linear" },
              { value: "curved", label: "Curved" },
            ]}
          />

          <Slider
            label="Elements"
            value={array.num_elements}
            onChange={(val) => onChange({ num_elements: Math.round(val) })}
            min={2}
            max={128}
            step={1}
          />

          <NumberInput
            label="Element Spacing (m)"
            value={array.element_spacing}
            onChange={(val) => onChange({ element_spacing: val })}
            min={0.001}
            max={1}
            step={0.001}
          />

          {array.type === "curved" && (
            <>
              <NumberInput
                label="Curvature Radius (m)"
                value={array.curvature_radius || 0.1}
                onChange={(val) => onChange({ curvature_radius: val })}
                min={0.01}
                max={1}
                step={0.01}
              />
              <Slider
                label="Arc Angle"
                value={array.arc_angle || 60}
                onChange={(val) => onChange({ arc_angle: val })}
                min={10}
                max={180}
                step={1}
                unit="°"
              />
            </>
          )}

          <div className="section-title">Frequencies</div>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <button
              className={`btn ${
                freqMode === "individual" ? "btn-primary" : "btn-secondary"
              }`}
              onClick={() => handleFreqModeChange("individual")}
              style={{ flex: 1 }}
            >
              Individual
            </button>
            <button
              className={`btn ${
                freqMode === "range" ? "btn-primary" : "btn-secondary"
              }`}
              onClick={() => handleFreqModeChange("range")}
              style={{ flex: 1 }}
            >
              Range
            </button>
          </div>

          {freqMode === "individual" ? (
            <FrequencyList
              frequencies={
                Array.isArray(array.frequencies)
                  ? array.frequencies
                  : [array.frequencies]
              }
              onChange={(freqs) => onChange({ frequencies: freqs })}
            />
          ) : (
            <FrequencyRange
              frequencies={
                Array.isArray(array.frequencies)
                  ? array.frequencies
                  : [array.frequencies]
              }
              onChange={(freqs) => onChange({ frequencies: freqs })}
            />
          )}

          <div className="section-title">Steering</div>
          <Toggle
            label="Focus Mode"
            checked={useFocus}
            onChange={(checked) => {
              setUseFocus(checked);
              if (!checked) {
                onChange({ focus_point: null });
              } else {
                onChange({ focus_point: { x: 0, y: 1 } });
              }
            }}
          />

          {!useFocus ? (
            <Slider
              label="Steering Angle"
              value={array.steering_angle || 0}
              onChange={(val) => onChange({ steering_angle: val })}
              min={-90}
              max={90}
              step={1}
              unit="°"
            />
          ) : (
            <>
              <NumberInput
                label="Focus X (m)"
                value={array.focus_point?.x || 0}
                onChange={(val) =>
                  onChange({ focus_point: { ...array.focus_point, x: val } })
                }
                step={0.01}
              />
              <NumberInput
                label="Focus Y (m)"
                value={array.focus_point?.y || 1}
                onChange={(val) =>
                  onChange({ focus_point: { ...array.focus_point, y: val } })
                }
                step={0.01}
              />
            </>
          )}

          <div className="section-title">Position</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <NumberInput
              label="X (m)"
              value={array.position?.x || 0}
              onChange={(val) =>
                onChange({ position: { ...array.position, x: val } })
              }
              step={0.01}
            />
            <NumberInput
              label="Y (m)"
              value={array.position?.y || 0}
              onChange={(val) =>
                onChange({ position: { ...array.position, y: val } })
              }
              step={0.01}
            />
            <NumberInput
              label="Rotation"
              value={array.rotation || 0}
              onChange={(val) => onChange({ rotation: val })}
              min={-180}
              max={180}
              step={1}
              unit="°"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FrequencyList({ frequencies, onChange }) {
  const updateFreq = (index, value) => {
    const newFreqs = [...frequencies];
    newFreqs[index] = value;
    onChange(newFreqs);
  };

  const addFreq = () => {
    onChange([
      ...frequencies,
      frequencies.length > 0
        ? frequencies[frequencies.length - 1] + 1000
        : 5000,
    ]);
  };

  const removeFreq = (index) => {
    if (frequencies.length > 1) {
      const newFreqs = frequencies.filter((_, i) => i !== index);
      onChange(newFreqs);
    }
  };

  return (
    <div>
      {frequencies.map((freq, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.5rem",
            alignItems: "center",
          }}
        >
          <NumberInput
            label={`f${idx + 1}`}
            value={freq}
            onChange={(val) => updateFreq(idx, val)}
            min={100}
            max={10000000}
            step={100}
            unit="Hz"
          />
          <button
            className="btn btn-danger"
            onClick={() => removeFreq(idx)}
            disabled={frequencies.length === 1}
          >
            ×
          </button>
        </div>
      ))}
      <Button variant="secondary" onClick={addFreq} style={{ width: "100%" }}>
        + Add Frequency
      </Button>
    </div>
  );
}

function FrequencyRange({ frequencies, onChange }) {
  const minFreq = Math.min(...frequencies);
  const maxFreq = Math.max(...frequencies);
  const step = (maxFreq - minFreq) / Math.max(1, frequencies.length - 1);

  const updateRange = (from, to, stepSize) => {
    const count = Math.max(2, Math.floor((to - from) / stepSize) + 1);
    const newFreqs = [];
    for (let i = 0; i < count; i++) {
      newFreqs.push(from + i * stepSize);
    }
    onChange(newFreqs);
  };

  return (
    <div>
      <NumberInput
        label="From (Hz)"
        value={minFreq}
        onChange={(val) => updateRange(val, maxFreq, step)}
        min={100}
        max={10000000}
        step={100}
      />
      <NumberInput
        label="To (Hz)"
        value={maxFreq}
        onChange={(val) => updateRange(minFreq, val, step)}
        min={100}
        max={10000000}
        step={100}
      />
      <NumberInput
        label="Step (Hz)"
        value={step}
        onChange={(val) => updateRange(minFreq, maxFreq, val)}
        min={100}
        max={1000000}
        step={100}
      />
      <div
        style={{
          marginTop: "0.5rem",
          color: "var(--color-text-secondary)",
          fontSize: "0.875rem",
        }}
      >
        Count: {frequencies.length} frequencies
      </div>
    </div>
  );
}
