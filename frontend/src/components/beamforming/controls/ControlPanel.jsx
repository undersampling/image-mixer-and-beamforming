import React from 'react';
import { ScenarioLoader } from './ScenarioLoader';
import { MediumSelector } from './MediumSelector';
import { ArrayManager } from './ArrayManager';

export function ControlPanel() {
  return (
    <div className="control-panel">
      <ScenarioLoader />
      <MediumSelector />
      <ArrayManager />
    </div>
  );
}