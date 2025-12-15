import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageMixerProvider } from '../components/mixer/ImageMixerContext';
import { ImageViewer } from '../components/mixer/ImageViewer';
import { ComponentViewer } from '../components/mixer/ComponentViewer';
import { OutputViewer } from '../components/mixer/OutputViewer';
import { ControlPanel } from '../components/mixer/ControlPanel';
import '../styles/MixerPage.css';
import '../styles/ImageViewer.css';
import '../styles/ComponentViewer.css';
import '../styles/OutputViewer.css';
import '../styles/ControlPanel.css';

/**
 * MixerPage Component
 * 
 * Main page component for the Image Mixer application.
 * Orchestrates the layout and integration of all mixer components.
 */
export function PartAPage() {
  const navigate = useNavigate();

  return (
    <ImageMixerProvider>
      <div className="App">
        <main className="App-main">
          <div className="main-content">
            <div className="controls-left">
              {/* Navigation Button */}
              <button
                onClick={() => navigate('/beamforming')}
                className="nav-button"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '14px 20px',
                  marginBottom: '20px',
                  backgroundColor: '#FF3838',
                  border: '1px solid #ff38384d',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.color = '#0f172a';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Go to Beamforming
              </button>

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
