import React from "react";
import { useSimulator } from "../../../context/SimulatorContext";
import { InterferenceMap } from "./InterferenceMap";
import { BeamProfile } from "./BeamProfile";
import { ArrayDiagram } from "./ArrayDiagram";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import "./VisualizationContainer.css";

export function VisualizationContainer() {
  const { results, config, loading, initializing } = useSimulator();

  if (initializing || (!results && loading)) {
    return (
      <div className="visualization-container loading">
        <LoadingSpinner />
        <p style={{marginTop: '1rem', color: '#64748b'}}>Calculating physics...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="visualization-container no-data">
        <p>Select a scenario to begin</p>
      </div>
    );
  }

  const isUpdating = loading && results;

  return (
    <div className="visualization-container">
      {isUpdating && (
        <div className="status-overlay">
          <div className="status-dot"></div> SYNCING
        </div>
      )}

      <div className="viz-grid">
        {/* LEFT: Main Map */}
        <div className="viz-item main-stage">
          <h3>Field Intensity</h3>
          <InterferenceMap
            data={results.interference_map}
            arrayPositions={results.array_positions}
          />
        </div>

        {/* RIGHT: Stacked Instruments */}
        <div className="instruments-column">
          
          <div className="viz-item instrument">
            <h3>Beam Pattern (Far Field)</h3>
            <BeamProfile 
              data={results.beam_profiles} 
              arrays={config.arrays} 
            />
          </div>

          <div className="viz-item instrument">
            <h3>Array Geometry (Physical)</h3>
            <ArrayDiagram
              arrayPositions={results.array_positions}
              config={config}
            />
          </div>
          
        </div>
      </div>
    </div>
  );
}