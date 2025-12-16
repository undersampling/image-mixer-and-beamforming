import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageMixerProvider } from '../components/mixer/ImageMixerContext';
import { ImageViewer } from '../components/mixer/ImageViewer';
import { ComponentViewer } from '../components/mixer/ComponentViewer';
import { OutputViewer } from '../components/mixer/OutputViewer';
import { ControlPanel } from '../components/mixer/ControlPanel';
import { MixerProgressBar } from '../components/mixer/MixerProgressBar';
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
              {/* Fixed Header - Navigation and Progress */}
              <div className="controls-fixed-header">
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
                    marginBottom: '12px',
                    backgroundColor: '#0891B2',
                    border: '1px solid rgba(8, 145, 178, 0.5)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(8, 145, 178, 0.3), 0 2px 4px -1px rgba(8, 145, 178, 0.2)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(34, 211, 238, 0.3), 0 4px 6px -2px rgba(34, 211, 238, 0.2)';
                    e.currentTarget.style.backgroundColor = '#22D3EE';
                    e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(8, 145, 178, 0.3), 0 2px 4px -1px rgba(8, 145, 178, 0.2)';
                    e.currentTarget.style.backgroundColor = '#0891B2';
                    e.currentTarget.style.borderColor = 'rgba(8, 145, 178, 0.5)';
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
                <MixerProgressBar />
              </div>

              {/* Scrollable Control Panel Content */}
              <div className="controls-left-scrollable">
                <ControlPanel />
              </div>
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
