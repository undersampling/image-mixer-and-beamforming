import React, { useEffect, useRef } from 'react';
import { useImageMixer } from './ImageMixerContext';
import { ImageControl } from './ImageControl';
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
    imageRegionModes,
    setImageRegionMode,
    mixingMode,
    setMixingMode,
    regionMode,
    setRegionMode,
    currentOutputViewer,
    setCurrentOutputViewer,
    mixImages,
    isMixing,
    mixingProgress,
    uploadMultipleImages,
  } = useImageMixer();
  
  const fileInputRef = useRef(null);

  const handleWeightChange = (index, value) => {
    const newWeights = [...imageWeights];
    newWeights[index] = parseInt(value);
    setImageWeights(newWeights);
  };

  // Track previous values to detect actual changes
  const prevValuesRef = React.useRef({
    imageWeights: JSON.stringify(imageWeights),
    imageRegionModes: JSON.stringify(imageRegionModes),
    mixingMode,
    regionMode,
    currentOutputViewer
  });

  // Debounced effect for all mixing triggers
  useEffect(() => {
    // Don't mix if already mixing or no weights set
    if (isMixing || !imageWeights.some(w => w > 0)) {
      return;
    }

    // Check if any actual values changed (not just isMixing)
    const currentValues = {
      imageWeights: JSON.stringify(imageWeights),
      imageRegionModes: JSON.stringify(imageRegionModes),
      mixingMode,
      regionMode,
      currentOutputViewer
    };

    const hasChanges = 
      currentValues.imageWeights !== prevValuesRef.current.imageWeights ||
      currentValues.imageRegionModes !== prevValuesRef.current.imageRegionModes ||
      currentValues.mixingMode !== prevValuesRef.current.mixingMode ||
      currentValues.regionMode !== prevValuesRef.current.regionMode ||
      currentValues.currentOutputViewer !== prevValuesRef.current.currentOutputViewer;

    if (!hasChanges) {
      return;
    }

    // Update previous values
    prevValuesRef.current = currentValues;

    const timeoutId = setTimeout(() => {
      mixImages();
    }, 300); // Debounce all mixing operations

    return () => clearTimeout(timeoutId);
  }, [imageWeights, imageRegionModes, mixingMode, regionMode, currentOutputViewer, mixImages, isMixing]);

  // Handle bulk upload of 4 images at once
  const handleBulkUpload = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadMultipleImages(files);
    }
    // Reset the input so the same files can be selected again
    e.target.value = '';
  };

  return (
    <div className="control-panel">
      {/* Hidden file input for bulk upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBulkUpload}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />
      
      {/* Upload 4 Images Button - NOT sticky */}
      <div className="control-section">
        <button
          className="upload-all-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isMixing}
        >
          Upload 4 Images
        </button>
      </div>



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
          <option value="INNER_OUTER">Inner / Outer</option>
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
            <ImageControl
              key={index}
              index={index}
              mode={imageModes[index]}
              regionMode={imageRegionModes[index]}
              globalRegionMode={regionMode}
              globalMixingMode={mixingMode}
              weight={imageWeights[index]}
              onModeChange={setImageMode}
              onRegionModeChange={setImageRegionMode}
              onWeightChange={handleWeightChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

