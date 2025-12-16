import React from 'react';
import '../../styles/ControlPanel.css';

/**
 * ImageControl Component
 * 
 * Renders controls for a single image, including:
 * - Component mode selection (Magnitude/Phase or Real/Imaginary)
 * - Region mode selection (Inner/Outer)
 * - Weight slider
 */
export const ImageControl = ({ 
  index, 
  mode, 
  regionMode, 
  globalRegionMode, 
  globalMixingMode, 
  weight, 
  onModeChange, 
  onRegionModeChange, 
  onWeightChange 
}) => {
  return (
    <div className="weight-control">
      <label>Image {index + 1}</label>
      <div className="image-mode-selects">
        <select
          value={mode}
          onChange={(e) => onModeChange(index, e.target.value)}
          className="mode-select-small"
        >
          {globalMixingMode === 'MAGNITUDE_PHASE' ? (
            <>
              <option value="MAGNITUDE">Magnitude</option>
              <option value="PHASE">Phase</option>
            </>
          ) : (
            <>
              <option value="REAL">Real</option>
              <option value="IMAGINARY">Imaginary</option>
            </>
          )}
        </select>
        
        {/* Per-image region mode selector - only when Inner/Outer is selected */}
        {globalRegionMode === 'INNER_OUTER' && (
          <select
            value={regionMode}
            onChange={(e) => onRegionModeChange(index, e.target.value)}
            className="mode-select-small region-select"
          >
            <option value="INNER">Inner</option>
            <option value="OUTER">Outer</option>
          </select>
        )}
      </div>
      
      <input
        type="range"
        min="0"
        max="100"
        value={weight}
        onChange={(e) => onWeightChange(index, e.target.value)}
        className="weight-slider"
      />
      <span className="weight-value">{weight}%</span>
    </div>
  );
};
