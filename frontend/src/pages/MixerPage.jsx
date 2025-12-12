import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

// API Configuration
const API_BASE = "http://localhost:8000/api";

// Image Viewer Component
const ImageViewer = ({
  imageId,
  sessionId,
  onRemove,
  onComponentChange,
  onBrightnessContrastChange
}) => {
  const [currentComponent, setCurrentComponent] = useState("original");
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Fetch image component
  const fetchComponent = async (component) => {
    if (!sessionId || !imageId) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/mixer/image/component/`, {
        params: { session_id: sessionId, image_id: imageId, component }
      });
      setImageData(response.data.image_data);
    } catch (error) {
      console.error("Error fetching component:", error);
      alert("Error loading image component: " + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  // Update brightness/contrast on server
  const updateAdjustments = async (newBrightness, newContrast) => {
    try {
      await axios.post(`${API_BASE}/mixer/image/adjust/`, {
        session_id: sessionId,
        image_id: imageId,
        brightness: newBrightness,
        contrast: newContrast
      });
      fetchComponent(currentComponent);
    } catch (error) {
      console.error("Error adjusting image:", error);
    }
  };

  // Handle component change
  const handleComponentChange = (e) => {
    const component = e.target.value;
    setCurrentComponent(component);
    fetchComponent(component);
    onComponentChange(imageId, component);
  };

  // Mouse drag for brightness/contrast
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const newBrightness = brightness + deltaX * 0.5;
    const newContrast = Math.max(0.1, contrast - deltaY * 0.01);

    setBrightness(newBrightness);
    setContrast(newContrast);
    setDragStart({ x: e.clientX, y: e.clientY });

    onBrightnessContrastChange(imageId, newBrightness, newContrast);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      updateAdjustments(brightness, contrast);
    }
  };

  useEffect(() => {
    if (sessionId && imageId) {
      fetchComponent(currentComponent);
    }
  }, [sessionId, imageId]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, brightness, contrast]);

  return (
    <div className="image-viewer">
      <div className="viewer-header">
        <select value={currentComponent} onChange={handleComponentChange} className="dropdown">
          <option value="original">Original</option>
          <option value="magnitude">FT Magnitude</option>
          <option value="phase">FT Phase</option>
          <option value="real">FT Real</option>
          <option value="imaginary">FT Imaginary</option>
        </select>
        <button onClick={() => onRemove(imageId)} className="btn btn-danger">✕</button>
      </div>

      <div
        className="viewer-canvas"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'move' : 'crosshair' }}
      >
        {loading ? (
          <div className="spinner"></div>
        ) : imageData ? (
          <img
            src={`data:image/png;base64,${imageData}`}
            alt="Component"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            draggable={false}
          />
        ) : (
          <div className="placeholder">Loading...</div>
        )}
      </div>

      <div className="viewer-info">
        <span>Brightness: {brightness.toFixed(0)} | Contrast: {contrast.toFixed(2)}</span>
      </div>
    </div>
  );
};

// Mixer Controls Component
const MixerControls = ({ images, sessionId, onMix, mixing }) => {
  const [mixConfigs, setMixConfigs] = useState([]);
  const [regionType, setRegionType] = useState('all');
  const [regionSize, setRegionSize] = useState(0.3);

  useEffect(() => {
    // Initialize mix configs for all images
    const configs = images.map(img => ({
      image_id: img.id,
      component: 'magnitude',
      weight: 0
    }));
    setMixConfigs(configs);
  }, [images]);

  const updateMixConfig = (imageId, field, value) => {
    setMixConfigs(prev => prev.map(config =>
      config.image_id === imageId
        ? { ...config, [field]: value }
        : config
    ));
  };

  const handleMix = () => {
    onMix(mixConfigs, regionType, regionSize);
  };

  return (
    <div className="mixer-controls">
      <h3>Mix Configuration</h3>

      {/* Quick Help */}
      <div className="help-panel">
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--color-primary-1)', fontSize: '0.85rem' }}>
            💡 Quick Guide
          </summary>
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
            <p><strong>Weight:</strong> How much each image contributes (0.0-1.0)</p>
            <p><strong>Magnitude:</strong> Shape & structure of the image</p>
            <p><strong>Phase:</strong> Position & details (usually more important!)</p>
            <p><strong>Inner Region:</strong> Smooth shapes (low frequencies)</p>
            <p><strong>Outer Region:</strong> Edges & details (high frequencies)</p>
            <hr style={{ margin: '0.5rem 0', opacity: 0.3 }} />
            <p style={{ fontStyle: 'italic' }}>
              Try: Magnitude from Image1 + Phase from Image2 = Classic mix!
            </p>
          </div>
        </details>
      </div>

      {images.map((img, idx) => {
        const config = mixConfigs.find(c => c.image_id === img.id) || {};
        return (
          <div key={img.id} className="mix-control-group">
            <label className="label">Image {idx + 1}</label>

            <div className="control-row">
              <select
                value={config.component || 'magnitude'}
                onChange={(e) => updateMixConfig(img.id, 'component', e.target.value)}
                className="dropdown"
              >
                <option value="magnitude">Magnitude</option>
                <option value="phase">Phase</option>
                <option value="real">Real</option>
                <option value="imaginary">Imaginary</option>
              </select>
            </div>

            <div className="control-row">
              <div className="slider-label">
                <span title="How much this image contributes to the mix (0.0 = none, 1.0 = full)">
                  Weight ℹ️
                </span>
                <span className="slider-value">{config.weight?.toFixed(2) || '0.00'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.weight || 0}
                onChange={(e) => updateMixConfig(img.id, 'weight', parseFloat(e.target.value))}
                className="slider"
                title="0.0 = no contribution, 1.0 = full contribution"
              />
            </div>
          </div>
        );
      })}

      <div className="region-controls">
        <h4 title="Select which frequency range to use from each image">
          Frequency Region ℹ️
        </h4>
        <select
          value={regionType}
          onChange={(e) => setRegionType(e.target.value)}
          className="dropdown"
          title="Inner = smooth shapes (low freq), Outer = edges/details (high freq)"
        >
          <option value="all">All Frequencies</option>
          <option value="inner">Low Frequencies (Inner) - Smooth shapes</option>
          <option value="outer">High Frequencies (Outer) - Edges & details</option>
        </select>

        {regionType !== 'all' && (
          <div className="control-row">
            <div className="slider-label">
              <span title="Size of the frequency region (0.1 = small, 0.5 = large)">
                Region Size ℹ️
              </span>
              <span className="slider-value">{regionSize.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={regionSize}
              onChange={(e) => setRegionSize(parseFloat(e.target.value))}
              className="slider"
              title="0.1 = tiny region, 0.5 = half the spectrum"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleMix}
        disabled={mixing || images.length === 0}
        className="btn btn-primary"
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {mixing ? 'Mixing...' : 'Mix Images'}
      </button>
    </div>
  );
};

// Output Viewer Component
const OutputViewer = ({ title, outputData, progress }) => {
  return (
    <div className="output-viewer">
      <h3>{title}</h3>
      <div className="output-canvas">
        {progress !== null && progress < 1 ? (
          <div className="progress-container">
            <div className="spinner"></div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }}></div>
            </div>
            <p>Processing... {(progress * 100).toFixed(0)}%</p>
          </div>
        ) : outputData ? (
          <img
            src={`data:image/png;base64,${outputData}`}
            alt="Output"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        ) : (
          <div className="placeholder">Mix images to see output</div>
        )}
      </div>
    </div>
  );
};

// Main Mixer Page
export function PartAPage() {
  const [sessionId, setSessionId] = useState(null);
  const [images, setImages] = useState([]);
  const [outputs, setOutputs] = useState([null, null]);
  const [activeOutput, setActiveOutput] = useState(0);
  const [mixing, setMixing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [currentOperation, setCurrentOperation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Upload image with better error handling
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      e.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large. Please select an image smaller than 10MB');
      e.target.value = '';
      return;
    }

    setUploading(true);

    const reader = new FileReader();

    reader.onerror = () => {
      alert('Error reading file');
      setUploading(false);
      e.target.value = '';
    };

    reader.onload = async (event) => {
      try {
        const base64Data = event.target.result;

        console.log('Uploading image...', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          sessionId: sessionId
        });

        const response = await axios.post(`${API_BASE}/mixer/upload/`, {
          session_id: sessionId,
          image_data: base64Data
        });

        console.log('Upload response:', response.data);

        setSessionId(response.data.session_id);
        setImages(prev => [...prev, {
          id: response.data.image_id,
          info: response.data.info
        }]);

        alert(`Image uploaded successfully! ID: ${response.data.image_id}`);
      } catch (error) {
        console.error("Upload error:", error);
        console.error("Error response:", error.response?.data);

        const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
        alert(`Error uploading image: ${errorMsg}`);
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  // Remove image
  const handleRemoveImage = async (imageId) => {
    if (!confirm('Remove this image?')) return;

    try {
      await axios.post(`${API_BASE}/mixer/image/remove/`, {
        session_id: sessionId,
        image_id: imageId
      });
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error("Error removing image:", error);
      alert('Error removing image: ' + (error.response?.data?.error || error.message));
    }
  };

  // Poll for mixing progress
  const pollProgress = async (operationId) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE}/mixer/mix/progress/`, {
          params: { operation_id: operationId }
        });

        const { status, progress: prog, result, error } = response.data;

        setProgress(prog);

        if (status === 'completed') {
          clearInterval(interval);
          setMixing(false);
          setProgress(null);

          const newOutputs = [...outputs];
          newOutputs[activeOutput] = result;
          setOutputs(newOutputs);

          setCurrentOperation(null);
        } else if (status === 'failed' || status === 'cancelled') {
          clearInterval(interval);
          setMixing(false);
          setProgress(null);
          setCurrentOperation(null);
          if (error) alert(`Mixing failed: ${error}`);
        }
      } catch (error) {
        console.error("Error polling progress:", error);
        clearInterval(interval);
        setMixing(false);
        setProgress(null);
      }
    }, 500);
  };

  // Start mixing
  const handleMix = async (mixConfigs, regionType, regionSize) => {
    // Cancel previous operation
    if (currentOperation) {
      try {
        await axios.post(`${API_BASE}/mixer/mix/cancel/`, {
          operation_id: currentOperation
        });
      } catch (error) {
        console.error("Error cancelling operation:", error);
      }
    }

    setMixing(true);
    setProgress(0);

    try {
      const response = await axios.post(`${API_BASE}/mixer/mix/start/`, {
        session_id: sessionId,
        mix_configs: mixConfigs,
        region_type: regionType,
        region_size: regionSize
      });

      const operationId = response.data.operation_id;
      setCurrentOperation(operationId);
      pollProgress(operationId);
    } catch (error) {
      console.error("Error starting mix:", error);
      setMixing(false);
      setProgress(null);
      alert("Error starting mix operation: " + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "1rem" }}>
      <div className="mixer-layout">
        {/* Header */}
        <div className="mixer-header">
          <h2>Image Fourier Mixer</h2>
          <div className="header-actions">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 4 || uploading}
              className="btn btn-primary"
            >
              {uploading ? 'Uploading...' : `Upload Image (${images.length}/4)`}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            {sessionId && (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                Session: {sessionId.substring(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="mixer-content">
          {/* Image Viewers */}
          <div className="viewers-grid">
            {[0, 1, 2, 3].map(idx => (
              <div key={idx} className="viewer-slot">
                {images[idx] ? (
                  <ImageViewer
                    imageId={images[idx].id}
                    sessionId={sessionId}
                    onRemove={handleRemoveImage}
                    onComponentChange={() => {}}
                    onBrightnessContrastChange={() => {}}
                  />
                ) : (
                  <div className="empty-viewer">
                    <p>Image Slot {idx + 1}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                      Click Upload to add image
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary"
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mixer Controls */}
          <div className="mixer-sidebar">
            {images.length > 0 ? (
              <MixerControls
                images={images}
                sessionId={sessionId}
                onMix={handleMix}
                mixing={mixing}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                <p>Upload images to start mixing</p>
              </div>
            )}
          </div>
        </div>

        {/* Output Viewers */}
        <div className="output-section">
          <div className="output-header">
            <button
              onClick={() => setActiveOutput(0)}
              className={`btn ${activeOutput === 0 ? 'btn-primary' : 'btn-secondary'}`}
            >
              Output 1 {activeOutput === 0 && '(Active)'}
            </button>
            <button
              onClick={() => setActiveOutput(1)}
              className={`btn ${activeOutput === 1 ? 'btn-primary' : 'btn-secondary'}`}
            >
              Output 2 {activeOutput === 1 && '(Active)'}
            </button>
          </div>

          <div className="outputs-grid">
            <OutputViewer
              title="Output 1"
              outputData={outputs[0]}
              progress={activeOutput === 0 ? progress : null}
            />
            <OutputViewer
              title="Output 2"
              outputData={outputs[1]}
              progress={activeOutput === 1 ? progress : null}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .mixer-layout {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          gap: 1rem;
        }

        .mixer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--color-bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(34, 211, 238, 0.3);
        }

        .mixer-header h2 {
          margin: 0;
          color: var(--color-primary-1);
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .mixer-content {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1rem;
          min-height: 500px;
        }

        .viewers-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .viewer-slot {
          background: var(--color-bg-card);
          border-radius: var(--radius-lg);
          padding: 1rem;
          min-height: 300px;
          border: 1px solid rgba(34, 211, 238, 0.2);
        }

        .image-viewer {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          height: 100%;
        }

        .viewer-header {
          display: flex;
          gap: 0.5rem;
          justify-content: space-between;
        }

        .viewer-canvas {
          flex: 1;
          background: #000;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          min-height: 200px;
          border: 1px solid rgba(34, 211, 238, 0.3);
        }

        .viewer-info {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-family: monospace;
          text-align: center;
        }

        .empty-viewer {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 1rem;
          color: var(--color-text-light);
        }

        .mixer-sidebar {
          background: var(--color-bg-card);
          border-radius: var(--radius-lg);
          padding: 1rem;
          overflow-y: auto;
          border: 1px solid rgba(34, 211, 238, 0.2);
          max-height: 800px;
        }

        .help-panel {
          background: rgba(34, 211, 238, 0.1);
          border: 1px solid rgba(34, 211, 238, 0.3);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          margin-bottom: 1rem;
        }

        .help-panel p {
          margin: 0.25rem 0;
        }

        .mixer-controls h3 {
          margin: 0 0 1rem 0;
          color: var(--color-primary-1);
          font-size: 1rem;
        }

        .mix-control-group {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-bg-hover);
        }

        .control-row {
          margin-top: 0.5rem;
        }

        .slider-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .slider-value {
          color: var(--color-primary-1);
          font-weight: 600;
        }

        .region-controls {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 2px solid var(--color-bg-hover);
        }

        .region-controls h4 {
          margin: 0 0 0.5rem 0;
          color: var(--color-text-primary);
          font-size: 0.9rem;
        }

        .output-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .output-header {
          display: flex;
          gap: 0.5rem;
        }

        .outputs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .output-viewer {
          background: var(--color-bg-card);
          border-radius: var(--radius-lg);
          padding: 1rem;
          border: 1px solid rgba(34, 211, 238, 0.2);
        }

        .output-viewer h3 {
          margin: 0 0 0.5rem 0;
          color: var(--color-primary-1);
          font-size: 0.9rem;
        }

        .output-canvas {
          background: #000;
          border-radius: var(--radius-md);
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(34, 211, 238, 0.3);
        }

        .placeholder {
          color: var(--color-text-light);
          text-align: center;
          padding: 2rem;
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
        }

        .progress-bar {
          width: 200px;
          height: 8px;
          background: var(--color-bg-hover);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary-1), var(--color-primary-2));
          transition: width 0.3s ease;
        }

        @media (max-width: 1024px) {
          .mixer-content {
            grid-template-columns: 1fr;
          }
          
          .viewers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}