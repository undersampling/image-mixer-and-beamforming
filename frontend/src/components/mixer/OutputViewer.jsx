import React from 'react';
import { useImageMixer } from './ImageMixerContext';
import '../../styles/OutputViewer.css';

/**
 * OutputViewer Component
 * 
 * Displays the mixed result image in one of two output viewports.
 */
export const OutputViewer = ({ outputIndex }) => {
  const { outputImages, isMixing, mixingProgress } = useImageMixer();

  return (
    <div className="output-viewer">
      <div className="output-header">
        <h3>Output {outputIndex + 1}</h3>
        {isMixing && outputIndex === 0 && (
          <div className="mixing-progress">
            <div className="progress-bar" style={{ width: `${mixingProgress}%` }}></div>
          </div>
        )}
      </div>
      <div className="output-content">
        {outputImages[outputIndex] ? (
          <img
            src={`data:image/png;base64,${outputImages[outputIndex]}`}
            alt={`Output ${outputIndex + 1}`}
            className="output-image"
          />
        ) : (
          <div className="output-placeholder">
            <p>Mixed result will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

