import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import '../styles/MixerPage.css';
import '../styles/ImageViewer.css';
import '../styles/ComponentViewer.css';
import '../styles/OutputViewer.css';
import '../styles/ControlPanel.css';

const ImageMixerContext = createContext();

const API_BASE_URL = '/api/mixer';

export const useImageMixer = () => {
  const context = useContext(ImageMixerContext);
  if (!context) {
    throw new Error('useImageMixer must be used within ImageMixerProvider');
  }
  return context;
};

export const ImageMixerProvider = ({ children }) => {
  const [images, setImages] = useState([null, null, null, null]);
  const [imageWeights, setImageWeights] = useState([0, 0, 0, 0]);
  const [imageModes, setImageModes] = useState(['MAGNITUDE', 'MAGNITUDE', 'MAGNITUDE', 'MAGNITUDE']);
  const [mixingMode, setMixingMode] = useState('MAGNITUDE_PHASE');
  const [regionMode, setRegionMode] = useState('FULL');
  const [roiBoundaries, setRoiBoundaries] = useState([0, 0, 100, 100]);
  const [roiState, setRoiState] = useState({ x: 50, y: 50, width: 100, height: 100 });
  const [outputImages, setOutputImages] = useState([null, null]);
  const [currentOutputViewer, setCurrentOutputViewer] = useState(0);
  const [componentTypes, setComponentTypes] = useState(['magnitude', 'magnitude', 'magnitude', 'magnitude']);
  const [isMixing, setIsMixing] = useState(false);
  const [mixingProgress, setMixingProgress] = useState(0);
  const [mixCancelToken, setMixCancelToken] = useState(null);

  const uploadImage = useCallback(async (file, imageIndex) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('image_index', imageIndex);

      const response = await axios.post(`${API_BASE_URL}/upload-image/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const newImages = [...images];
        newImages[imageIndex] = response.data.image_data;
        setImages(newImages);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Error uploading image:', error);
      return { success: false, error: error.message };
    }
  }, [images]);

  const getImageComponent = useCallback(async (imageIndex, componentType) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/image/${imageIndex}/component/${componentType}/`
      );

      if (response.data.success) {
        return { success: true, data: response.data.image_data };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Error getting component:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const mixImages = useCallback(async () => {
    // Update ROI boundaries before mixing if region mode requires it
    if (regionMode === 'INNER' || regionMode === 'OUTER') {
      // Trigger boundary update by finding any component viewer and updating
      // This ensures boundaries are current before mixing
      const componentViewers = document.querySelectorAll('.component-image');
      if (componentViewers.length > 0) {
        // Boundaries will be updated by the ComponentViewer's updateRoiBoundaries
        // We'll use the current roiBoundaries which should be up to date
      }
    }

    if (mixCancelToken) {
      mixCancelToken.cancel('New mixing request');
    }

    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    setMixCancelToken(source);
    setIsMixing(true);
    setMixingProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setMixingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const response = await axios.post(`${API_BASE_URL}/mix/`, {
        weights: imageWeights,
        boundaries: roiBoundaries,
        region_mode: regionMode,
        output_viewer: currentOutputViewer,
        current_mode: mixingMode,
      }, {
        cancelToken: source.token
      });

      clearInterval(progressInterval);
      setMixingProgress(100);

      if (response.data.success) {
        const newOutputImages = [...outputImages];
        newOutputImages[currentOutputViewer] = response.data.image_data;
        setOutputImages(newOutputImages);
        setIsMixing(false);
        setMixCancelToken(null);
        setTimeout(() => setMixingProgress(0), 500);
        return { success: true, data: response.data };
      }
      setIsMixing(false);
      setMixCancelToken(null);
      setMixingProgress(0);
      return { success: false, error: response.data.error };
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Mixing cancelled');
        setIsMixing(false);
        setMixCancelToken(null);
        setMixingProgress(0);
        return { success: false, error: 'Cancelled' };
      }
      console.error('Error mixing images:', error);
      setIsMixing(false);
      setMixCancelToken(null);
      setMixingProgress(0);
      return { success: false, error: error.message };
    }
  }, [imageWeights, roiBoundaries, regionMode, currentOutputViewer, mixingMode, outputImages, mixCancelToken]);

  const adjustBrightnessContrast = useCallback(async (imageIndex, brightness, contrast) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/adjust-brightness-contrast/`, {
        image_index: imageIndex,
        brightness,
        contrast,
      });

      if (response.data.success) {
        const newImages = [...images];
        newImages[imageIndex] = response.data.image_data;
        setImages(newImages);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Error adjusting brightness/contrast:', error);
      return { success: false, error: error.message };
    }
  }, [images]);

  const resetBrightnessContrast = useCallback(async (imageIndex) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reset-brightness-contrast/`, {
        image_index: imageIndex,
      });

      if (response.data.success) {
        const newImages = [...images];
        newImages[imageIndex] = response.data.image_data;
        setImages(newImages);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Error resetting brightness/contrast:', error);
      return { success: false, error: error.message };
    }
  }, [images]);

  const setImageMode = useCallback(async (imageIndex, mode) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/set-image-mode/`, {
        image_index: imageIndex,
        mode,
      });

      if (response.data.success) {
        const newModes = [...imageModes];
        newModes[imageIndex] = mode;
        setImageModes(newModes);
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Error setting image mode:', error);
      return { success: false, error: error.message };
    }
  }, [imageModes]);

  const updateMixingMode = useCallback(async (mode) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/set-mixing-mode/`, {
        mode,
      });

      if (response.data.success) {
        setMixingMode(mode);
        const newComponentTypes = mode === 'MAGNITUDE_PHASE' 
          ? ['magnitude', 'magnitude', 'magnitude', 'magnitude']
          : ['real', 'real', 'real', 'real'];
        setComponentTypes(newComponentTypes);
        
        const newImageModes = mode === 'MAGNITUDE_PHASE'
          ? ['MAGNITUDE', 'MAGNITUDE', 'MAGNITUDE', 'MAGNITUDE']
          : ['REAL', 'REAL', 'REAL', 'REAL'];
        
        const modePromises = [];
        for (let i = 0; i < 4; i++) {
          modePromises.push(setImageMode(i, newImageModes[i]));
        }
        await Promise.all(modePromises);
        
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Error setting mixing mode:', error);
      return { success: false, error: error.message };
    }
  }, [setImageMode]);

  const value = {
    images,
    imageWeights,
    setImageWeights,
    imageModes,
    setImageMode,
    mixingMode,
    setMixingMode: updateMixingMode,
    regionMode,
    setRegionMode,
    roiBoundaries,
    setRoiBoundaries,
    roiState,
    setRoiState,
    outputImages,
    currentOutputViewer,
    setCurrentOutputViewer,
    componentTypes,
    setComponentTypes,
    isMixing,
    mixingProgress,
    mixImages,
    uploadImage,
    getImageComponent,
    adjustBrightnessContrast,
    resetBrightnessContrast,
  };

  return (
    <ImageMixerContext.Provider value={value}>
      {children}
    </ImageMixerContext.Provider>
  );
};

// ImageViewer Component
const ImageViewer = ({ imageIndex }) => {
  const { images, uploadImage, adjustBrightnessContrast, resetBrightnessContrast } = useImageMixer();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  const handleDoubleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadImage(file, imageIndex);
    }
  };

  const handleMouseDown = (e) => {
    if (images[imageIndex]) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = useCallback(async (e) => {
    if (isDragging && images[imageIndex]) {
      const totalDeltaY = e.clientY - dragStart.y;
      const totalDeltaX = e.clientX - dragStart.x;
      const brightness = -totalDeltaY * 0.5;
      const contrast = totalDeltaX * 0.01;
      
      await adjustBrightnessContrast(imageIndex, brightness, contrast);
    }
  }, [isDragging, dragStart, images, imageIndex, adjustBrightnessContrast]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  return (
    <div 
      className="image-viewer"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onDragStart={(e) => e.preventDefault()}
      ref={imageRef}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      {images[imageIndex] ? (
        <img
          src={`data:image/png;base64,${images[imageIndex]}`}
          alt={`Image ${imageIndex + 1}`}
          className="viewer-image"
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
        />
      ) : (
        <div className="image-placeholder">
          <p>Double-click to load image {imageIndex + 1}</p>
        </div>
      )}
      {isDragging && (
        <div className="drag-indicator">Adjusting brightness/contrast...</div>
      )}
      {images[imageIndex] && (
        <div className="image-controls">
          <button
            className="reset-button"
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();
              await resetBrightnessContrast(imageIndex);
            }}
            title="Reset brightness/contrast"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

// ComponentViewer Component
const ComponentViewer = ({ imageIndex }) => {
  const { 
    images, 
    getImageComponent, 
    componentTypes, 
    setComponentTypes,
    setRoiBoundaries,
    roiState,
    setRoiState,
    mixingMode,
    setImageMode,
    regionMode,
  } = useImageMixer();
  const [componentImage, setComponentImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const containerRef = useRef(null);
  const roiRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (images[imageIndex]) {
      loadComponent();
    }
  }, [images[imageIndex], componentTypes[imageIndex], regionMode]);

  // Update ROI boundaries when region mode changes or component image loads
  useEffect(() => {
    if (componentImage && (regionMode === 'INNER' || regionMode === 'OUTER')) {
      // Small delay to ensure image is rendered
      const timer = setTimeout(() => {
        const img = containerRef.current?.querySelector('.component-image');
        if (img && img.complete) {
          updateRoiBoundaries(img);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [componentImage, regionMode]);

  const loadComponent = async () => {
    if (images[imageIndex]) {
      const result = await getImageComponent(imageIndex, componentTypes[imageIndex]);
      if (result.success) {
        setComponentImage(result.data);
      }
    }
  };

  // Update image dimensions when component image loads
  const handleImageLoad = (e) => {
    if (e.target.naturalWidth && e.target.naturalHeight) {
      setImageDimensions({
        width: e.target.naturalWidth,
        height: e.target.naturalHeight
      });
      // Update boundaries when image loads
      updateRoiBoundaries(e.target);
    }
  };

  const handleComponentTypeChange = (e) => {
    const newType = e.target.value;
    const newComponentTypes = [...componentTypes];
    newComponentTypes[imageIndex] = newType;
    setComponentTypes(newComponentTypes);
  };

  const updateRoiBoundaries = (imgElement = null) => {
    const img = imgElement || containerRef.current?.querySelector('.component-image');
    if (!img || !containerRef.current) return;
    
    const imgRect = img.getBoundingClientRect();
    const actualWidth = img.naturalWidth || imageDimensions.width || 512;
    const actualHeight = img.naturalHeight || imageDimensions.height || 512;
    
    // Calculate scale factors
    const scaleX = actualWidth / imgRect.width;
    const scaleY = actualHeight / imgRect.height;
    
    // Convert display coordinates to image coordinates
    const left = Math.max(0, Math.floor(roiState.x * scaleX));
    const top = Math.max(0, Math.floor(roiState.y * scaleY));
    const right = Math.min(actualWidth - 1, Math.floor((roiState.x + roiState.width) * scaleX));
    const bottom = Math.min(actualHeight - 1, Math.floor((roiState.y + roiState.height) * scaleY));
    
    // Ensure valid boundaries
    if (right > left && bottom > top) {
      setRoiBoundaries([left, top, right, bottom]);
    }
  };

  const handleRoiMouseDown = (e) => {
    e.stopPropagation();
    const isResizeHandle = e.target.classList.contains('resize-handle');
    const handle = isResizeHandle ? e.target.dataset.handle : null;
    
    if (isResizeHandle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      setIsDragging(true);
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    const roiX = roiState.x;
    const roiY = roiState.y;
    const roiWidth = roiState.width;
    const roiHeight = roiState.height;

    const handleMouseMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      if (isResizeHandle && handle) {
        setRoiState(prevRoi => {
          let newRoi = { ...prevRoi };
          switch (handle) {
            case 'se':
              newRoi.width = Math.max(20, roiWidth + deltaX);
              newRoi.height = Math.max(20, roiHeight + deltaY);
              break;
            case 'sw':
              newRoi.x = Math.max(0, roiX + deltaX);
              newRoi.width = Math.max(20, roiWidth - deltaX);
              newRoi.height = Math.max(20, roiHeight + deltaY);
              break;
            case 'ne':
              newRoi.y = Math.max(0, roiY + deltaY);
              newRoi.width = Math.max(20, roiWidth + deltaX);
              newRoi.height = Math.max(20, roiHeight - deltaY);
              break;
            case 'nw':
              newRoi.x = Math.max(0, roiX + deltaX);
              newRoi.y = Math.max(0, roiY + deltaY);
              newRoi.width = Math.max(20, roiWidth - deltaX);
              newRoi.height = Math.max(20, roiHeight - deltaY);
              break;
          }
          if (newRoi.x + newRoi.width > rect.width) newRoi.width = rect.width - newRoi.x;
          if (newRoi.y + newRoi.height > rect.height) newRoi.height = rect.height - newRoi.y;
          return newRoi;
        });
      } else {
        setRoiState(prevRoi => {
          const newX = Math.max(0, Math.min(roiX + deltaX, rect.width - roiWidth));
          const newY = Math.max(0, Math.min(roiY + deltaY, rect.height - roiHeight));
          return { ...prevRoi, x: newX, y: newY };
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      // Update boundaries when mouse is released
      setTimeout(() => updateRoiBoundaries(), 0);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getComponentOptions = () => {
    return mixingMode === 'MAGNITUDE_PHASE' 
      ? ['magnitude', 'phase']
      : ['real', 'imaginary'];
  };

  return (
    <div className="component-viewer" ref={containerRef}>
      <div className="component-controls">
        <select
          value={componentTypes[imageIndex]}
          onChange={handleComponentTypeChange}
          className="component-select"
        >
          {getComponentOptions().map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </div>
      {componentImage ? (
        <div className="component-image-container">
          <img
            ref={imgRef}
            src={`data:image/png;base64,${componentImage}`}
            alt={`Component ${imageIndex + 1}`}
            className="component-image"
            onLoad={handleImageLoad}
          />
          {(regionMode === 'INNER' || regionMode === 'OUTER') && (
            <div
              className="roi-overlay"
              style={{
                left: `${roiState.x}px`,
                top: `${roiState.y}px`,
                width: `${roiState.width}px`,
                height: `${roiState.height}px`,
              }}
              onMouseDown={handleRoiMouseDown}
              ref={roiRef}
            >
              <div className="resize-handle" data-handle="nw"></div>
              <div className="resize-handle" data-handle="ne"></div>
              <div className="resize-handle" data-handle="sw"></div>
              <div className="resize-handle" data-handle="se"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="component-placeholder">
          <p>Load image to view components</p>
        </div>
      )}
    </div>
  );
};

// OutputViewer Component
const OutputViewer = ({ outputIndex }) => {
  const { outputImages } = useImageMixer();

  return (
    <div className="output-viewer">
      <div className="output-header">
        <h3>Output {outputIndex + 1}</h3>
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

// ControlPanel Component
const ControlPanel = () => {
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

  const handleWeightRelease = useCallback(async () => {
    if (!isMixing && imageWeights.some(w => w > 0)) {
      await mixImages();
    }
  }, [mixImages, isMixing, imageWeights]);

  // Single debounced effect for all mixing triggers
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
                onMouseUp={handleWeightRelease}
                onTouchEnd={handleWeightRelease}
                className="weight-slider"
              />
              <span className="weight-value">{imageWeights[index]}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main MixerPage Component
export function PartAPage() {
  return (
    <ImageMixerProvider>
      <div className="App">
        <header className="App-header">
          <h1>Fourier Transform Image Mixer</h1>
        </header>
        <main className="App-main">
          <div className="main-content">
            <div className="controls-left">
              <ControlPanel />
            </div>
            <div className="images-right">
              <div className="input-section">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="image-panel">
                    <div className="image-viewer-container">
                      <ImageViewer imageIndex={index} />
                    </div>
                    <div className="component-viewer-container">
                      <ComponentViewer imageIndex={index} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="output-section">
                <OutputViewer outputIndex={0} />
                <OutputViewer outputIndex={1} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </ImageMixerProvider>
  );
}

