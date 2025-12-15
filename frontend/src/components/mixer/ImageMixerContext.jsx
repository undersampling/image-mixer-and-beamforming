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
  
  // Refs to store latest values for real-time updates
  const imageWeightsRef = useRef(imageWeights);
  const regionModeRef = useRef(regionMode);
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

  const mixImages = useCallback(async (customBoundaries = null) => {
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

      // Use custom boundaries if provided, otherwise use state boundaries
      // Use refs to get latest values for real-time updates
      const boundariesToUse = customBoundaries || roiBoundaries;

      const response = await axios.post(`${API_BASE_URL}/mix/`, {
        weights: imageWeightsRef.current,
        boundaries: boundariesToUse,
        region_mode: regionModeRef.current,
        output_viewer: currentOutputViewerRef.current,
        current_mode: mixingModeRef.current,
      }, {
        cancelToken: source.token
      });

      clearInterval(progressInterval);
      setMixingProgress(100);

      if (response.data.success) {
        const newOutputImages = [...outputImagesRef.current];
        newOutputImages[currentOutputViewerRef.current] = response.data.image_data;
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

