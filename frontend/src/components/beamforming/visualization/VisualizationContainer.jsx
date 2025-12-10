import React from "react";
import { useSimulator } from "../../../context/SimulatorContext";
import { InterferenceMap } from "./InterferenceMap";
import { BeamProfile } from "./BeamProfile";
import { ArrayDiagram } from "./ArrayDiagram";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import "./VisualizationContainer.css";

export function VisualizationContainer() {
  const { results, config, loading, initializing } = useSimulator();

  // Show full loading screen ONLY if we are initializing or if we have no results yet
  if (initializing || (!results && loading)) {
    return (
      <div className="visualization-container loading">
        <LoadingSpinner />
        <p>
          {initializing 
            ? "Loading scenario..." 
            : "Calculating..."}
        </p>
      </div>
    );
  }

  // Only show "Load a scenario" if we truly have no config (user hasn't loaded anything)
  if (!config) {
    return (
      <div className="visualization-container no-data">
        <p>Load a scenario to see visualizations</p>
      </div>
    );
  }

  // If we have results, show them (even if loading is true - real-time update)
  // We can add a subtle indicator if needed, or just let it update smoothly
  const isUpdating = loading && results;

  return (
    <div className="visualization-container">
      <div className="viz-grid">
        <div className="viz-item full-width">
          <InterferenceMap
            data={results.interference_map}
            arrayPositions={results.array_positions}
          />
        </div>
        <div className="viz-item">
          <BeamProfile data={results.beam_profiles} arrays={config.arrays} />
        </div>
        <div className="viz-item">
          <ArrayDiagram
            arrayPositions={results.array_positions}
            config={config}
          />
        </div>
      </div>
    </div>
  );
}
