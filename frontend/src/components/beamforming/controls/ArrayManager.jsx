import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSimulator } from "../../../context/SimulatorContext";
import { Card } from "../../common/Card";
import { Button } from "../../common/Button";
import { Slider } from "../../common/Slider";
import { NumberInput } from "../../common/NumberInput";
import { Toggle } from "../../common/Toggle";
import { Dropdown } from "../../common/Dropdown";
import "../../../styles/ArrayManager.css";

export function ArrayManager() {
  const { config, updateArray, addArray, removeArray, calculationProgress, isCalculating } = useSimulator();
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
      curvature_radius: 0.1,
      arc_angle: 60
    });
    setExpandedArray(newId);
  };

  return (
    <Card title="Phased Arrays" defaultExpanded={true}>
      <div className="calculation-progress-sticky">
        <div className="calculation-progress-section">
          <h4 className="progress-label">Processing</h4>
          <div className="calculation-progress-container">
            <div 
              className="calculation-progress-bar" 
              style={{ 
                width: isCalculating ? '100%' : '0%', 
                opacity: isCalculating ? 1 : 0,
                transition: 'opacity 0.2s' 
              }}
            />
            <span className="calculation-progress-text">
              {isCalculating ? 'Updating...' : 'Ready'}
            </span>
          </div>
        </div>
      </div>
      
      <Button
        variant="primary"
        onClick={handleAddArray}
        style={{ marginTop: "1rem", marginBottom: "3px", width: "100%" }}
      >
        + Add Array
      </Button>

      {config.arrays.map((array, idx) => (
        <RealTimeArrayConfig
          key={array.id}
          array={array}
          index={idx}
          isExpanded={expandedArray === array.id}
          onExpand={() => setExpandedArray(expandedArray === array.id ? null : array.id)}
          onChange={(updates) => updateArray(array.id, updates)}
          onDelete={() => {
            if (window.confirm("Delete this array?")) removeArray(array.id);
          }}
        />
      ))}
    </Card>
  );
}

// Frequency unit options
const FREQUENCY_UNITS = [
  { value: "Hz", label: "Hz", multiplier: 1 },
  { value: "kHz", label: "kHz", multiplier: 1e3 },
  { value: "MHz", label: "MHz", multiplier: 1e6 },
  { value: "GHz", label: "GHz", multiplier: 1e9 },
];

// --- ULTRA-FAST REAL-TIME COMPONENT ---
function RealTimeArrayConfig({ array, index, isExpanded, onExpand, onChange, onDelete }) {
  // 1. Local state for instant slider movement
  const [localArray, setLocalArray] = useState(array);
  const requestRef = useRef();
  
  // 2. Sync if backend updates externally
  useEffect(() => {
    setLocalArray(array);
  }, [array]);

  // 3. The "No Delay" Updater
  const updateImmediately = useCallback((updates) => {
    setLocalArray(prev => {
      const newState = { ...prev, ...updates };
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      requestRef.current = requestAnimationFrame(() => {
        onChange(newState);
      });
      
      return newState;
    });
  }, [onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const [useFocus, setUseFocus] = useState(array.focus_point !== null);
  
  const [freqMode, setFreqMode] = useState(
    Array.isArray(array.frequencies) && array.frequencies.length > 1
      ? "range"
      : "individual"
  );

  const handleFreqModeChange = (mode) => {
    setFreqMode(mode);
    if (mode === "individual") {
      const first = localArray.frequencies.length > 0 ? localArray.frequencies[0] : 5000;
      updateImmediately({ frequencies: [first] });
    } else {
      const first = localArray.frequencies[0] || 1000;
      updateImmediately({ frequencies: [first, first + 1000, first + 2000] });
    }
  };

  return (
    <div className="array-config">
      <div className="array-header" onClick={onExpand}>
        <span>
          {isExpanded ? "▼" : "►"} {localArray.name} ({localArray.type}, {localArray.num_elements} elements)
        </span>
        <button
          className="btn btn-danger"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
            value={localArray.type}
            onChange={(val) => {
                // --- FIX FOR 5G SCENARIO ---
                // When switching to 'curved', check if radius/angle are missing (0 or null).
                // If so, force-send the defaults (0.1m, 60deg) immediately.
                const updates = { type: val };
                if (val === 'curved') {
                    if (!localArray.curvature_radius || localArray.curvature_radius < 0.001) {
                        updates.curvature_radius = 0.1;
                    }
                    if (!localArray.arc_angle || localArray.arc_angle < 1) {
                        updates.arc_angle = 60;
                    }
                }
                updateImmediately(updates);
            }}
            options={[
              { value: "linear", label: "Linear" },
              { value: "curved", label: "Curved" },
            ]}
          />

          <Slider
            label="Elements"
            value={localArray.num_elements}
            onChange={(val) => updateImmediately({ num_elements: Math.round(val) })}
            min={1} max={128} step={1}
          />

          <NumberInput
            label="Element Spacing (m)"
            value={localArray.element_spacing}
            onChange={(val) => updateImmediately({ element_spacing: val })}
            min={0.00001} max={1} step={0.001}
          />

          {localArray.type === "curved" && (
            <>
              <NumberInput
                label="Curvature Radius (m)"
                value={localArray.curvature_radius || 0.1}
                onChange={(val) => updateImmediately({ curvature_radius: val })}
                min={0.01} max={10} step={0.01}
              />
              <Slider
                label="Arc Angle"
                value={localArray.arc_angle || 60}
                onChange={(val) => updateImmediately({ arc_angle: val })}
                min={10} max={360} step={1} unit="°"
              />
            </>
          )}

          <div className="section-title">Frequencies</div>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <button
              className={`btn ${freqMode === "individual" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleFreqModeChange("individual")}
              style={{ flex: 1 }}
            >
              Individual
            </button>
            <button
              className={`btn ${freqMode === "range" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleFreqModeChange("range")}
              style={{ flex: 1 }}
            >
              Range
            </button>
          </div>

          {freqMode === "individual" ? (
            <FrequencyList
              frequencies={Array.isArray(localArray.frequencies) ? localArray.frequencies : [localArray.frequencies]}
              onChange={(freqs) => updateImmediately({ frequencies: freqs })}
            />
          ) : (
            <FrequencyRange
              frequencies={Array.isArray(localArray.frequencies) ? localArray.frequencies : [localArray.frequencies]}
              onChange={(freqs) => updateImmediately({ frequencies: freqs })}
            />
          )}

          <div className="section-title">Steering</div>
          <Toggle
            label="Focus Mode"
            checked={useFocus}
            onChange={(checked) => {
              setUseFocus(checked);
              updateImmediately({ focus_point: checked ? { x: 0, y: 1 } : null });
            }}
          />

          {!useFocus ? (
            <Slider
              label="Steering Angle"
              value={localArray.steering_angle || 0}
              onChange={(val) => updateImmediately({ steering_angle: val })}
              min={-90} max={90} step={1} unit="°"
            />
          ) : (
            <>
              <div style={{display:'flex', gap:'5px'}}>
                <NumberInput
                  label="Focus X (m)"
                  value={localArray.focus_point?.x || 0}
                  onChange={(val) => updateImmediately({ focus_point: { ...localArray.focus_point, x: val } })}
                  step={0.01}
                />
                <NumberInput
                  label="Focus Y (m)"
                  value={localArray.focus_point?.y || 1}
                  onChange={(val) => updateImmediately({ focus_point: { ...localArray.focus_point, y: val } })}
                  step={0.01}
                />
              </div>
            </>
          )}

          <div className="section-title">Array Position</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <NumberInput
              label="X (m)"
              value={localArray.position?.x || 0}
              onChange={(val) => updateImmediately({ position: { ...localArray.position, x: val } })}
              step={0.01}
            />
            <NumberInput
              label="Y (m)"
              value={localArray.position?.y || 0}
              onChange={(val) => updateImmediately({ position: { ...localArray.position, y: val } })}
              step={0.01}
            />
            <NumberInput
              label="Rotation"
              value={localArray.rotation || 0}
              onChange={(val) => updateImmediately({ rotation: val })}
              min={-180} max={180} step={1} unit="°"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// --- FREQUENCY COMPONENTS ---

function FrequencyList({ frequencies, onChange }) {
  const [freqUnits, setFreqUnits] = useState(() => frequencies.map(() => "Hz"));

  useEffect(() => {
    if (freqUnits.length !== frequencies.length) {
      setFreqUnits(frequencies.map((_, i) => freqUnits[i] || "Hz"));
    }
  }, [frequencies.length]);

  const getMultiplier = (unit) => {
    const unitObj = FREQUENCY_UNITS.find((u) => u.value === unit);
    return unitObj ? unitObj.multiplier : 1;
  };

  const toDisplayValue = (hzValue, unit) => hzValue / getMultiplier(unit);
  const toHzValue = (displayValue, unit) => displayValue * getMultiplier(unit);

  const getStep = (unit) => {
    const multiplier = getMultiplier(unit);
    if (multiplier >= 1e9) return 0.1;
    if (multiplier >= 1e6) return 1;
    if (multiplier >= 1e3) return 10;
    return 100;
  };

  const updateFreq = (index, displayValue) => {
    const newFreqs = [...frequencies];
    newFreqs[index] = toHzValue(displayValue, freqUnits[index]);
    onChange(newFreqs);
  };

  const updateUnit = (index, newUnit) => {
    const newUnits = [...freqUnits];
    newUnits[index] = newUnit;
    setFreqUnits(newUnits);
  };

  const addFreq = () => {
    const lastFreq = frequencies.length > 0 ? frequencies[frequencies.length - 1] : 5000;
    onChange([...frequencies, lastFreq + 1000]);
    setFreqUnits([...freqUnits, "Hz"]);
  };

  const removeFreq = (index) => {
    if (frequencies.length > 1) {
      const newFreqs = frequencies.filter((_, i) => i !== index);
      const newUnits = freqUnits.filter((_, i) => i !== index);
      onChange(newFreqs);
      setFreqUnits(newUnits);
    }
  };

  return (
    <div>
      {frequencies.map((freq, idx) => (
        <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "flex-end" }}>
          <NumberInput
            label={`f${idx + 1}`}
            value={toDisplayValue(freq, freqUnits[idx] || "Hz")}
            onChange={(val) => updateFreq(idx, val)}
            min={0.001} max={100000000000} step={getStep(freqUnits[idx] || "Hz")}
          />
          <select
            className="dropdown"
            value={freqUnits[idx] || "Hz"}
            onChange={(e) => updateUnit(idx, e.target.value)}
            style={{ padding: "0.5rem", minWidth: "20px", height: "38px", marginBottom: "var(--spacing-md)" }}
          >
            {FREQUENCY_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <button
            className="btn btn-danger"
            onClick={() => removeFreq(idx)}
            disabled={frequencies.length === 1}
            style={{ marginBottom: "var(--spacing-md)" }}
          >
            ×
          </button>
        </div>
      ))}
      <Button variant="secondary" onClick={addFreq} style={{ width: "100%" }}>+ Add Frequency</Button>
    </div>
  );
}

function FrequencyRange({ frequencies, onChange }) {
  const [unit, setUnit] = useState("Hz");

  const getMultiplier = (u) => {
    const unitObj = FREQUENCY_UNITS.find((uo) => uo.value === u);
    return unitObj ? unitObj.multiplier : 1;
  };
  const multiplier = getMultiplier(unit);
  const toDisplayValue = (hzValue) => hzValue / multiplier;
  const toHzValue = (displayValue) => displayValue * multiplier;

  const minFreq = Math.min(...frequencies);
  const maxFreq = Math.max(...frequencies);
  const step = (maxFreq - minFreq) / Math.max(1, frequencies.length - 1);

  const updateRange = (fromDisplay, toDisplay, stepDisplay) => {
    const from = toHzValue(fromDisplay);
    const to = toHzValue(toDisplay);
    const stepSize = toHzValue(stepDisplay);
    const count = Math.max(2, Math.floor((to - from) / stepSize) + 1);
    const newFreqs = [];
    for (let i = 0; i < count; i++) {
      newFreqs.push(from + i * stepSize);
    }
    onChange(newFreqs);
  };

  const getStep = () => {
    if (multiplier >= 1e9) return 0.1;
    if (multiplier >= 1e6) return 1;
    if (multiplier >= 1e3) return 10;
    return 100;
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <label className="label">Unit</label>
        <select
          className="dropdown"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          style={{ width: "100%" }}
        >
          {FREQUENCY_UNITS.map((u) => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>
      <NumberInput
        label={`From (${unit})`}
        value={toDisplayValue(minFreq)}
        onChange={(val) => updateRange(val, toDisplayValue(maxFreq), toDisplayValue(step))}
        min={0.001} max={100000000000} step={getStep()}
      />
      <NumberInput
        label={`To (${unit})`}
        value={toDisplayValue(maxFreq)}
        onChange={(val) => updateRange(toDisplayValue(minFreq), val, toDisplayValue(step))}
        min={0.001} max={100000000000} step={getStep()}
      />
      <NumberInput
        label={`Step (${unit})`}
        value={toDisplayValue(step)}
        onChange={(val) => updateRange(toDisplayValue(minFreq), toDisplayValue(maxFreq), val)}
        min={0.001} max={100000000000} step={getStep()}
      />
      <div style={{ marginTop: "0.5rem", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
        Count: {frequencies.length} frequencies
      </div>
    </div>
  );
}