import React from 'react';
import { useImageMixer } from './ImageMixerContext';
import '../../styles/ControlPanel.css';

export const MixerProgressBar = () => {
  const { isMixing, mixingProgress } = useImageMixer();

  return (
    <div className="control-section" >
      <h3 style={{ marginBottom: '0.8rem' }}>Processing</h3>


      <div className="mixing-progress-container">
        <div 
          className="progress-bar" 
          style={{ width: `${mixingProgress}%` }}
        />
        <span className="progress-text">
          {isMixing 
            ? `Mixing... ${mixingProgress}%` 
            : mixingProgress === 100 
              ? 'Complete!' 
              : 'Ready'}
        </span>
      </div>
    </div>
  );
};
