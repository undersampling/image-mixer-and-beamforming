import React from "react";
import { ControlPanel } from "../components/beamforming/controls/ControlPanel";
import { VisualizationContainer } from "../components/beamforming/visualization/VisualizationContainer";

export function PartBPage() {
  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <VisualizationContainer />
    </div>
  );
}
