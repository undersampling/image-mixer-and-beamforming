import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

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
  const [imageRegionModes, setImageRegionModes] = useState(['INNER', 'INNER', 'INNER', 'INNER']); // Per-image region modes
  const [mixingMode, setMixingMode] = useState('MAGNITUDE_PHASE');
  const [regionMode, setRegionMode] = useState('FULL'); // FULL or INNER_OUTER
  const [roiBoundaries, setRoiBoundaries] = useState([0, 0, 100, 100]);
  const [roiState, setRoiState] = useState({ x: 50, y: 50, width: 100, height: 100 });
  const [outputImages, setOutputImages] = useState([null, null]);
  const [currentOutputViewer, setCurrentOutputViewer] = useState(0);
  const [componentTypes, setComponentTypes] = useState(['magnitude', 'magnitude', 'magnitude', 'magnitude']);
  const [isMixing, setIsMixing] = useState(false);
  const [mixingProgress, setMixingProgress] = useState(0);
  const [mixCancelToken, setMixCancelToken] = useState(null);
  
  // Refs to store latest values for real-time updates
  const imageWeightsRef = useRef(imageWeights);
  const regionModeRef = useRef(regionMode);
  const imageRegionModesRef = useRef(imageRegionModes);
  const currentOutputViewerRef = useRef(currentOutputViewer);
  const mixingModeRef = useRef(mixingMode);
  const outputImagesRef = useRef(outputImages);
  
  // Update refs when state changes
  useEffect(() => {
    imageWeightsRef.current = imageWeights;
  }, [imageWeights]);
  
  useEffect(() => {
    regionModeRef.current = regionMode;
  }, [regionMode]);
  
  useEffect(() => {
    imageRegionModesRef.current = imageRegionModes;
  }, [imageRegionModes]);
  
  useEffect(() => {
    currentOutputViewerRef.current = currentOutputViewer;
  }, [currentOutputViewer]);
  
  useEffect(() => {
    mixingModeRef.current = mixingMode;
  }, [mixingMode]);
  
  useEffect(() => {
    outputImagesRef.current = outputImages;
  }, [outputImages]);

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

  // Upload multiple images at once (up to 4)
  const uploadMultipleImages = useCallback(async (files) => {
    const filesToUpload = Array.from(files).slice(0, 4); // Limit to 4 files
    const results = [];
    const newImages = [...images];
    
    setIsMixing(true);
    setMixingProgress(0);
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      
      // Update progress
      setMixingProgress(Math.round(((i + 0.5) / filesToUpload.length) * 100));
      
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('image_index', i);

        const response = await axios.post(`${API_BASE_URL}/upload-image/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          newImages[i] = response.data.image_data;
          results.push({ success: true, index: i });
        } else {
          results.push({ success: false, index: i, error: response.data.error });
        }
      } catch (error) {
        console.error(`Error uploading image ${i}:`, error);
        results.push({ success: false, index: i, error: error.message });
      }
      
      // Update progress after each upload
      setMixingProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
    }
    
    setImages(newImages);
    setIsMixing(false);
    setTimeout(() => setMixingProgress(0), 500);
    
    return results;
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

  const pollIntervalRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const mixImages = useCallback(async (customBoundaries = null) => {
    // 1. Cancel/Clear previous operation logic
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    // We can also call backend cancel endpoint if we want absolute cleanup
    // await axios.post(`${API_BASE_URL}/mix-cancel/`);

    if (mixCancelToken) {
        mixCancelToken.cancel('New mixing request');
    }

    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    setMixCancelToken(source);
    setIsMixing(true);
    setMixingProgress(0); // Reset to 0 initially

    try {
      // Use custom boundaries if provided, otherwise use state boundaries
      const boundariesToUse = customBoundaries || roiBoundaries;

      // 2. Start Mixing Task (Async)
      const startResponse = await axios.post(`${API_BASE_URL}/mix/`, {
        weights: imageWeightsRef.current,
        boundaries: boundariesToUse,
        region_mode: regionModeRef.current,
        image_region_modes: imageRegionModesRef.current,
        output_viewer: currentOutputViewerRef.current,
        current_mode: mixingModeRef.current,
      }, {
        cancelToken: source.token
      });

      if (!startResponse.data.success) {
        setIsMixing(false);
        setMixingProgress(0);
        return { success: false, error: startResponse.data.error };
      }
      
      // 3. Start Polling for Status
      return new Promise((resolve) => {
        pollIntervalRef.current = setInterval(async () => {
            try {
                const statusResponse = await axios.get(`${API_BASE_URL}/mix-status/`);
                if (statusResponse.data.success) {
                    const { is_mixing, progress, error } = statusResponse.data;
                    
                    setMixingProgress(progress);
                    
                    if (error) {
                        clearInterval(pollIntervalRef.current);
                        setIsMixing(false);
                        resolve({ success: false, error });
                        return;
                    }
                    
                    if (!is_mixing && progress === 100) {
                        // 4. Task Completed, Fetch Result
                        clearInterval(pollIntervalRef.current);
                        
                        // Fetch final result
                        const resultResponse = await axios.get(`${API_BASE_URL}/mix-result/`);
                        
                        if (resultResponse.data.success) {
                            const newOutputImages = [...outputImagesRef.current];
                            newOutputImages[currentOutputViewerRef.current] = resultResponse.data.image_data;
                            setOutputImages(newOutputImages);
                            resolve({ success: true, data: resultResponse.data });
                        } else {
                            resolve({ success: false, error: "Failed to fetch result" });
                        }
                        
                        setIsMixing(false);
                        setMixCancelToken(null);
                        // Delay clearing progress bar for UX
                        setTimeout(() => setMixingProgress(0), 500);
                    }
                }
            } catch (err) {
                console.error("Polling error", err);
                // Don't stop polling on transient network errors, but maybe count them.
                // For now, if 500, stop.
                if (err.response && err.response.status >= 400) {
                     clearInterval(pollIntervalRef.current);
                     setIsMixing(false);
                     resolve({ success: false, error: err.message });
                }
            }
        }, 100); // Poll every 100ms
      });

    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Mixing cancelled');
        // Do not affect state here as the new request will take over
        return { success: false, error: 'Cancelled' };
      }
      console.error('Error mixing images:', error);
      setIsMixing(false);
      setMixCancelToken(null);
      setMixingProgress(0);
      return { success: false, error: error.message };
    }
  }, [mixCancelToken]);

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

  // Set region mode (INNER/OUTER) for a specific image
  const setImageRegionMode = useCallback((imageIndex, mode) => {
    const newRegionModes = [...imageRegionModes];
    newRegionModes[imageIndex] = mode;
    setImageRegionModes(newRegionModes);
  }, [imageRegionModes]);

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
    imageRegionModes,
    setImageRegionMode,
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
    uploadMultipleImages,
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

