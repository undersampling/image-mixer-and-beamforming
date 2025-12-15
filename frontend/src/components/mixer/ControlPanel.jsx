import React, { useEffect } from 'react';
import { useImageMixer } from './ImageMixerContext';
import '../../styles/ControlPanel.css';

/**
 * ControlPanel Component
 * 
 * Provides controls for mixing mode, region mode, output viewer selection,
 * and image weights/modes for mixing.
 */
export const ControlPanel = () => {
  const {
    imageWeights,
    setImageWeights,
    imageModes,
    setImageMode,
    mixingMode,
    setMixingMode,
    regionMode,
    setRegionMode,
    currentOutputViewer,
    setCurrentOutputViewer,
    mixImages,
    isMixing,
    mixingProgress,
  } = useImageMixer();

  const handleWeightChange = (index, value) => {
    const newWeights = [...imageWeights];
    newWeights[index] = parseInt(value);
    setImageWeights(newWeights);
  };

  // Debounced effect for all mixing triggers
  useEffect(() => {
    // Don't mix if already mixing or no weights set
    if (isMixing || !imageWeights.some(w => w > 0)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      mixImages();
    }, 300); // Debounce all mixing operations

    return () => clearTimeout(timeoutId);
  }, [imageWeights, mixingMode, regionMode, currentOutputViewer, mixImages, isMixing]);

  return (
    <div className="control-panel">
      <div className="control-section">
        <h3>Mixing Mode</h3>
        <select
          value={mixingMode}
          onChange={(e) => setMixingMode(e.target.value)}
          className="mode-select"
        >
          <option value="MAGNITUDE_PHASE">Magnitude / Phase</option>
          <option value="REAL_IMAGINARY">Real / Imaginary</option>
        </select>
      </div>

      <div className="control-section">
        <h3>Region Mode</h3>
        <select
          value={regionMode}
          onChange={(e) => setRegionMode(e.target.value)}
          className="mode-select"
        >
          <option value="FULL">Full</option>
          <option value="INNER">Inner</option>
          <option value="OUTER">Outer</option>
        </select>
      </div>

      <div className="control-section">
        <h3>Output Viewer</h3>
        <select
          value={currentOutputViewer}
          onChange={(e) => setCurrentOutputViewer(parseInt(e.target.value))}
          className="mode-select"
        >
          <option value={0}>Output 1</option>
          <option value={1}>Output 2</option>
        </select>
      </div>

      <div className="control-section weights-section">
        <h3>Image Weights & Modes</h3>
        <div className="weights-container">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="weight-control">
              <label>Image {index + 1}</label>
              <div className="image-mode-select">
                <select
                  value={imageModes[index]}
                  onChange={(e) => setImageMode(index, e.target.value)}
                  className="mode-select-small"
                >
                  {mixingMode === 'MAGNITUDE_PHASE' ? (
                    <>
                      <option value="MAGNITUDE">Magnitude</option>
                      <option value="PHASE">Phase</option>
                    </>
                  ) : (
                    <>
                      <option value="REAL">Real</option>
                      <option value="IMAGINARY">Imaginary</option>
                    </>
                  )}
                </select>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={imageWeights[index]}
                onChange={(e) => handleWeightChange(index, e.target.value)}
                className="weight-slider"
              />
              <span className="weight-value">{imageWeights[index]}%</span>
            </div>
          ))}
        </div>
      </div>
      
      {isMixing && (
        <div className="control-section">
          <div className="mixing-progress-container">
            <div className="progress-bar" style={{ width: `${mixingProgress}%` }}></div>
            <span className="progress-text">{mixingProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

