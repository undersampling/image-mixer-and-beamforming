import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useImageMixer } from './ImageMixerContext';
import '../../styles/ComponentViewer.css';

/**
 * ComponentViewer Component
 * 
 * Displays Fourier transform components (magnitude, phase, real, imaginary)
 * with ROI (Region of Interest) selection for inner/outer region mixing.
 * Updates ROI boundaries in real-time during drag operations.
 */
export const ComponentViewer = ({ imageIndex }) => {
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
    mixImages,
  } = useImageMixer();
  
  const [componentImage, setComponentImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const containerRef = useRef(null);
  const roiRef = useRef(null);
  const imgRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  
  // Update image offset when image loads or window resizes
  const updateImageOffset = useCallback(() => {
    if (imgRef.current && containerRef.current) {
      const imgRect = imgRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setImageOffset({
        x: imgRect.left - containerRect.left,
        y: imgRect.top - containerRect.top
      });
    }
  }, []);

  useEffect(() => {
    if (images[imageIndex]) {
      loadComponent();
    }
  }, [images[imageIndex], componentTypes[imageIndex], regionMode]);

  // Update ROI boundaries when region mode changes or component image loads
  useEffect(() => {
    if (componentImage && (regionMode === 'INNER' || regionMode === 'OUTER')) {
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
      const img = e.target;
      const imgRect = img.getBoundingClientRect();
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      
      // Update image offset
      updateImageOffset();
      
      // Initialize ROI position to be centered within the image bounds
      // ROI coordinates are relative to the image, not the container
      const imgDisplayWidth = imgRect.width;
      const imgDisplayHeight = imgRect.height;
      const initialRoiWidth = Math.min(100, imgDisplayWidth * 0.3);
      const initialRoiHeight = Math.min(100, imgDisplayHeight * 0.3);
      const initialRoiX = (imgDisplayWidth - initialRoiWidth) / 2;
      const initialRoiY = (imgDisplayHeight - initialRoiHeight) / 2;
      
      setRoiState({
        x: initialRoiX,
        y: initialRoiY,
        width: initialRoiWidth,
        height: initialRoiHeight
      });
      
      updateRoiBoundaries(e.target);
    }
  };
  
  // Update image offset on window resize
  useEffect(() => {
    const handleResize = () => {
      updateImageOffset();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateImageOffset]);

  const handleComponentTypeChange = (e) => {
    const newType = e.target.value;
    const newComponentTypes = [...componentTypes];
    newComponentTypes[imageIndex] = newType;
    setComponentTypes(newComponentTypes);
  };

  const updateRoiBoundaries = useCallback((imgElement = null) => {
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
  }, [roiState, imageDimensions, setRoiBoundaries]);

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
    
    // Get the image element - ROI coordinates are relative to the image
    const img = containerRef.current?.querySelector('.component-image');
    if (!img) {
      return;
    }
    
    const imgRect = img.getBoundingClientRect();
    // Calculate mouse position relative to the image (not container)
    const startX = e.clientX - imgRect.left;
    const startY = e.clientY - imgRect.top;
    
    // ROI state is relative to the image
    const roiX = roiState.x;
    const roiY = roiState.y;
    const roiWidth = roiState.width;
    const roiHeight = roiState.height;
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;

    const handleMouseMove = (e) => {
      const imgRectCurrent = img.getBoundingClientRect();
      // Calculate current mouse position relative to the image
      const currentX = e.clientX - imgRectCurrent.left;
      const currentY = e.clientY - imgRectCurrent.top;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      let newRoiState;
      
      if (isResizeHandle && handle) {
        let newRoi = { ...roiState };
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
        // Constrain to image bounds
        if (newRoi.x + newRoi.width > imgRectCurrent.width) {
          newRoi.width = imgRectCurrent.width - newRoi.x;
        }
        if (newRoi.y + newRoi.height > imgRectCurrent.height) {
          newRoi.height = imgRectCurrent.height - newRoi.y;
        }
        newRoiState = newRoi;
        setRoiState(newRoi);
      } else {
        // Dragging: constrain to image bounds
        const newX = Math.max(0, Math.min(roiX + deltaX, imgRectCurrent.width - roiWidth));
        const newY = Math.max(0, Math.min(roiY + deltaY, imgRectCurrent.height - roiHeight));
        newRoiState = { ...roiState, x: newX, y: newY };
        setRoiState(newRoiState);
      }
      
      // Real-time update of boundaries using the new state
      if (img) {
        const imgRectForScale = img.getBoundingClientRect();
        const actualWidth = img.naturalWidth || imageDimensions.width || 512;
        const actualHeight = img.naturalHeight || imageDimensions.height || 512;
        const scaleX = actualWidth / imgRectForScale.width;
        const scaleY = actualHeight / imgRectForScale.height;
        const left = Math.max(0, Math.floor(newRoiState.x * scaleX));
        const top = Math.max(0, Math.floor(newRoiState.y * scaleY));
        const right = Math.min(actualWidth - 1, Math.floor((newRoiState.x + newRoiState.width) * scaleX));
        const bottom = Math.min(actualHeight - 1, Math.floor((newRoiState.y + newRoiState.height) * scaleY));
        
        if (right > left && bottom > top) {
          const newBoundaries = [left, top, right, bottom];
          setRoiBoundaries(newBoundaries);
          
          // Real-time mixing with very short debounce for smooth updates
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          
          // Use a very short debounce (30ms) for near real-time feel
          updateTimeoutRef.current = setTimeout(() => {
            if (regionMode === 'INNER' || regionMode === 'OUTER') {
              // Pass the latest boundaries directly to avoid stale state
              mixImages(newBoundaries);
            }
          }, 30);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      // Final update when mouse is released
      updateRoiBoundaries();
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

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
          {(regionMode === 'INNER' || regionMode === 'OUTER') && componentImage && (
            <div
              className="roi-overlay"
              style={{
                // Position ROI relative to container, accounting for image offset
                left: `${imageOffset.x + roiState.x}px`,
                top: `${imageOffset.y + roiState.y}px`,
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

