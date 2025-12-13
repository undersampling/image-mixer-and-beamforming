import React from "react";
import { useNavigate } from "react-router-dom"; // 1. Import Router Hook
import { useSimulator } from "../../../context/SimulatorContext";
import { InterferenceMap } from "./InterferenceMap";
import { BeamProfile } from "./BeamProfile";
import { ArrayDiagram } from "./ArrayDiagram";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../common/Button"; // 2. Import Button (adjust path if necessary)
import "../../../styles/VisualizationContainer.css";

export function VisualizationContainer() {
  const { results, config, loading, initializing } = useSimulator();
  const navigate = useNavigate(); // 3. Initialize hook

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
        display: "flex",          
        flexDirection: "column",  
        height: "100%",           
        overflow: "hidden"        
      }}
    >
      
      {/* HEADER: Updated to Flexbox for button placement */}
      <div className="viz-header" style={{ 
        flex: "0 0 auto",
        padding: "0 0 1rem 0", 
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "1rem",
        display: "flex",                // Enable Flexbox
        justifyContent: "space-between", // Push items to edges
        alignItems: "center"            // Vertically center
      }}>
        <h1 style={{ 
          fontSize: "1.5rem", 
          margin: 0, 
          color: "var(--color-text-primary)" 
        }}>
          Beamforming Simulator
        </h1>

        {/* 4. Add Navigation Button */}
        <Button 
          variant="secondary" // Optional: Use 'primary' or 'secondary' depending on preference
          onClick={() => navigate('http://localhost:5173/mixer')} // Adjust route path as needed
        >
          Go to Image Mixer &rarr;
        </Button>
      </div>

      {/* GRID */}
      <div className="viz-grid" style={{
        flex: "1",        
        minHeight: "0",   
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
            zIndex: 10 
          }}
        >
          <div className="status-dot"></div> SYNCING
        </div>
      )}

    </div>
  );
}