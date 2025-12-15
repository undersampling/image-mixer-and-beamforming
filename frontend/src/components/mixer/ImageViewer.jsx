import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useImageMixer } from './ImageMixerContext';
import '../../styles/ImageViewer.css';

/**
 * ImageViewer Component
 * 
 * Displays an image with brightness/contrast controls.
 * 
 * Mouse Drag Controls:
 * - Drag Up/Down = Brightness (up = brighter, down = darker)
 * - Drag Left/Right = Contrast (right = more contrast, left = less contrast)
 * 
 * Brightness/contrast adjustments are display-only and don't affect mixing.
 */
export const ImageViewer = ({ imageIndex }) => {
  const { 
    images, 
    uploadImage, 
    adjustBrightnessContrast, 
    resetBrightnessContrast 
  } = useImageMixer();
  
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const brightnessRef = useRef(0);
  const contrastRef = useRef(0);
  const [displayBrightness, setDisplayBrightness] = useState(0);
  const [displayContrast, setDisplayContrast] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialValuesRef = useRef({ brightness: 0, contrast: 0 });
  
  // Clamp values to prevent cycling/wrapping
  const BRIGHTNESS_MIN = -255;
  const BRIGHTNESS_MAX = 255;
  const CONTRAST_MIN = -0.9;  // Prevents alpha from going negative
  const CONTRAST_MAX = 2.0;   // Reasonable upper limit for contrast

  const handleDoubleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadImage(file, imageIndex);
      brightnessRef.current = 0;
      contrastRef.current = 0;
    }
  };

  const handleMouseDown = useCallback((e) => {
    if (!images[imageIndex]) {
      return;
    }
    
    // Only start dragging if clicking on the image viewer area (not on buttons)
    if (e.target.closest('.image-controls') || e.target.closest('.reset-button')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY
    };
    // Store CURRENT values when drag starts (not zero) - so we adjust from current state
    initialValuesRef.current = {
      brightness: brightnessRef.current,
      contrast: contrastRef.current
    };
  }, [images, imageIndex]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !images[imageIndex]) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate total delta from initial drag position
    const totalDeltaX = e.clientX - dragStartRef.current.x;
    const totalDeltaY = e.clientY - dragStartRef.current.y;
    
    // Drag Up/Down = Brightness (up = brighter, down = darker)
    // Drag Left/Right = Contrast (right = more contrast, left = less contrast)
    const brightnessDelta = -totalDeltaY * 0.5;  // Negative because dragging down should darken
    const contrastDelta = totalDeltaX * 0.01;    // Positive because dragging right should increase contrast
    
    // Calculate new values from initial values + delta
    const newBrightness = Math.max(BRIGHTNESS_MIN, Math.min(BRIGHTNESS_MAX, initialValuesRef.current.brightness + brightnessDelta));
    const newContrast = Math.max(CONTRAST_MIN, Math.min(CONTRAST_MAX, initialValuesRef.current.contrast + contrastDelta));
    
    // Only update if values changed (to avoid unnecessary API calls)
    if (Math.abs(newBrightness - brightnessRef.current) > 0.1 || Math.abs(newContrast - contrastRef.current) > 0.001) {
      brightnessRef.current = newBrightness;
      contrastRef.current = newContrast;
      
      // Update display values for UI
      setDisplayBrightness(brightnessRef.current);
      setDisplayContrast(contrastRef.current);

      // Apply adjustments
      adjustBrightnessContrast(
        imageIndex,
        brightnessRef.current,
        contrastRef.current
      );
    }
  }, [isDragging, images, imageIndex, adjustBrightnessContrast]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleReset = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    brightnessRef.current = 0;
    contrastRef.current = 0;
    setDisplayBrightness(0);
    setDisplayContrast(0);
    await resetBrightnessContrast(imageIndex);
  };
  
  // Reset display values when image changes
  useEffect(() => {
    if (images[imageIndex]) {
      brightnessRef.current = 0;
      contrastRef.current = 0;
      setDisplayBrightness(0);
      setDisplayContrast(0);
    }
  }, [images, imageIndex]);

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
        <>
          <img
            src={`data:image/png;base64,${images[imageIndex]}`}
            alt={`Image ${imageIndex + 1}`}
            className="viewer-image"
            draggable="false"
            onDragStart={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
          />
          <div className="image-controls">
            <button
              className="reset-button"
              onClick={handleReset}
              title="Reset brightness/contrast to default"
            >
              Reset
            </button>
          </div>
        </>
      ) : (
        <div className="image-placeholder">
          <p>Double-click to load image {imageIndex + 1}</p>
        </div>
      )}
    </div>
  );
};

