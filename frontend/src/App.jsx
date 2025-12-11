import React from "react";
import { SimulatorProvider } from "./context/SimulatorContext";
import { MainLayout } from "./components/layout/MainLayout";
import { ControlPanel } from "./components/beamforming/controls/ControlPanel";
import { PartAPage } from "./pages/MixerPage";
import { PartBPage } from "./pages/BeamFormingPage";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <SimulatorProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/mixer"
            element={
              <MainLayout sidebar={null}>
                <PartAPage />
              </MainLayout>
            }
          />
          <Route
            path="/beamforming"
            element={
              <MainLayout sidebar={<ControlPanel />}>
                <PartBPage />
              </MainLayout>
            }
          />
          <Route path="/" element={<Navigate to="/beamforming" replace />} />
        </Routes>
      </BrowserRouter>
    </SimulatorProvider>
  );
}

export default App;
