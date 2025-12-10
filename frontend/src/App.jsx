import React, { useState } from "react";
import { SimulatorProvider } from "./context/SimulatorContext";
import { MainLayout } from "./components/layout/MainLayout";
import { ControlPanel } from "./components/beamforming/controls/ControlPanel";
import { PartAPage } from "./pages/PartA/PartAPage";
import { PartBPage } from "./pages/PartB/PartBPage";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("partb");

  const renderContent = () => {
    if (activeTab === "parta") {
      return <PartAPage />;
    }
    return <PartBPage />;
  };

  const renderSidebar = () => {
    if (activeTab === "partb") {
      return <ControlPanel />;
    }
    return null;
  };

  return (
    <SimulatorProvider>
      <MainLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sidebar={renderSidebar()}
      >
        {renderContent()}
      </MainLayout>
    </SimulatorProvider>
  );
}

export default App;
