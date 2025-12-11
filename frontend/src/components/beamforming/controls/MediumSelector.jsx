import React from 'react';
import { useSimulator } from '../../../context/SimulatorContext';
import { Card } from '../../common/Card';
import { NumberInput } from '../../common/NumberInput';
import { Toggle } from '../../common/Toggle';
import { Dropdown } from '../../common/Dropdown';

export function MediumSelector() {
  const { media, config, updateConfig } = useSimulator();

  if (!config) return null;

  const isCustom = !media.find(m => m.name === config.medium?.name);
  const [useCustom, setUseCustom] = React.useState(isCustom);

  const handleMediumChange = (mediumName) => {
    const mediumData = media.find(m => m.name === mediumName);
    updateConfig({
      medium: {
        name: mediumName,
        speed: mediumData?.speed || 343,
      },
    });
    setUseCustom(false);
  };

  const handleCustomSpeed = (speed) => {
    updateConfig({
      medium: {
        name: 'custom',
        speed,
      },
    });
  };

  const mediumOptions = media.map(m => ({
    value: m.name,
    label: `${m.name.charAt(0).toUpperCase() + m.name.slice(1).replace('_', ' ')} (${m.speed} m/s)`,
  }));

  return (
    <Card title="Propagation Medium"  defaultExpanded={true}>
      <Toggle
        label="Custom Speed"
        checked={useCustom}
        onChange={(checked) => {
          setUseCustom(checked);
          if (!checked) {
            handleMediumChange(media[0].name);
          }
        }}
      />
      {!useCustom ? (
        <Dropdown
          value={config.medium?.name || media[0]?.name || ''}
          onChange={handleMediumChange}
          options={mediumOptions}
        />
      ) : (
        <NumberInput
          label="Speed (m/s)"
          value={config.medium?.speed || 343}
          onChange={handleCustomSpeed}
          min={100}
          max={5000}
          step={1}
        />
      )}
    </Card>
  );
}