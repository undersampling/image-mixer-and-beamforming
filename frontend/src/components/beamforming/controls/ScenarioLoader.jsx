import React from "react";
import { useSimulator } from "../../../context/SimulatorContext";
import { Card } from "../../common/Card";
import { Button } from "../../common/Button";
import { Dropdown } from "../../common/Dropdown";

export function ScenarioLoader() {
  const {
    scenarios,
    currentScenario,
    loadScenario,
    saveScenario,
    resetScenario,
  } = useSimulator();

  const handleLoad = (scenarioId) => {
    if (scenarioId) {
      loadScenario(scenarioId);
    }
  };

  const handleSave = () => {
    if (currentScenario) {
      saveScenario(currentScenario);
      alert("Scenario saved!");
    }
  };

  const handleReset = () => {
    if (currentScenario) {
      if (window.confirm("Reset to default? This will discard your changes.")) {
        resetScenario(currentScenario);
      }
    }
  };

  // Safely map scenarios to options
  const scenarioOptions = Array.isArray(scenarios)
    ? scenarios.map((s) => ({
        value: s.id || s.value || "",
        label: s.name || s.label || "Unnamed Scenario",
      }))
    : [];

  return (
    <Card title="Scenario"  defaultExpanded={true}>
      <Dropdown
        label="Select Scenario"
        value={currentScenario || ""}
        onChange={handleLoad}
        options={scenarioOptions}
        placeholder={
          scenarios.length === 0
            ? "Loading scenarios..."
            : "Select a scenario..."
        }
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!currentScenario}
          style={{ flex: 1 }}
        >
          Save
        </Button>
        <Button
          variant="secondary"
          onClick={handleReset}
          disabled={!currentScenario}
          style={{ flex: 1 }}
        >
          Reset
        </Button>
      </div>
    </Card>
  );
}