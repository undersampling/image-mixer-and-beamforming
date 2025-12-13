import React from "react";
import { useSimulator } from "../../../context/SimulatorContext";
import { InterferenceMap } from "./InterferenceMap";
import { BeamProfile } from "./BeamProfile";
import { ArrayDiagram } from "./ArrayDiagram";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import "../../../styles/VisualizationContainer.css";

export function VisualizationContainer() {
  const { results, config, loading, initializing } = useSimulator();

  if (initializing || (!results && loading)) {
    return (
      <div className="visualization-container loading">
        <LoadingSpinner />
        <p style={{ color: "#64748b" }}>Calculating physics...</p>
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
    <div 
      className="visualization-container" 
      style={{ 
        position: "relative",
        // --- LAYOUT FIX ---
        display: "flex",          // Enable Flexbox
        flexDirection: "column",  // Stack items vertically
        height: "100%",           // Fill the parent height
        overflow: "hidden"        // Prevent outer scrollbars
      }}
    >
      
      {/* HEADER: Flex-shrink 0 (Don't shrink) */}
      <div className="viz-header" style={{ 
        flex: "0 0 auto", // Keep natural height
        padding: "0 0 1rem 0", 
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "1rem"
      }}>
        <h1 style={{ 
          fontSize: "1.5rem", 
          margin: 0, 
          color: "var(--color-text-primary)" 
        }}>
          Beamforming Simulator
        </h1>
      </div>

      {/* GRID: Flex-grow 1 (Fill remaining space) */}
      <div className="viz-grid" style={{
        flex: "1",        // Take up all remaining space
        minHeight: "0",   // Critical for scroll/overflow to work in Flexbox
      
      }}>
        {/* LEFT: Main Map */}
        <div className="viz-item main-stage">
          <h3>Field Intensity</h3>
          <InterferenceMap
            data={results.interference_map}
            arrayPositions={results.array_positions}
            beamProfiles={results.beam_profiles}
          />
        </div>

        {/* RIGHT: Stacked Instruments */}
        <div className="instruments-column">
          <div className="viz-item instrument">
            <h3>Beam Pattern (Far Field)</h3>
            <BeamProfile data={results.beam_profiles} arrays={config.arrays} />
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

      {/* SYNCING STATUS */}
      {isUpdating && (
        <div 
          className="status-overlay" 
          style={{ 
            top: "auto",
            bottom: "1rem",
            right: "1rem",
            position: "absolute",
            zIndex: 10 // Ensure it floats above graphs
          }}
        >
          <div className="status-dot"></div> SYNCING
        </div>
      )}

    </div>
  );
}