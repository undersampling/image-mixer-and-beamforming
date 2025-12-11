import React, { useRef, useEffect, useState } from "react";
import "../../../styles/InterferenceMap.css";

export function InterferenceMap({ data, arrayPositions }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  // State for axis labels to display in the UI
  const [axes, setAxes] = useState({ xMin: -1, xMax: 1, yMin: 0, yMax: 2 });

  useEffect(() => {
    if (!data || !data.map || !data.map.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false }); // Optimize for no transparency

    // Get simulation dimensions
    const map = data.map;
    const rows = map.length; // Y resolution
    const cols = map[0].length; // X resolution

    // Update Axes Labels
    setAxes({
      xMin: data.x_coords[0],
      xMax: data.x_coords[data.x_coords.length - 1],
      yMin: data.y_coords[0],
      yMax: data.y_coords[data.y_coords.length - 1],
    });

    // 1. Set Canvas Resolution to match Data Resolution exactly
    // This gives 1:1 pixel mapping for maximum sharpness
    canvas.width = cols;
    canvas.height = rows;

    // 2. Normalize Data
    // Find absolute max intensity to normalize (usually 0 to Max)
    let maxVal = 0;
    for (let row of map) {
      for (let val of row) {
        if (val > maxVal) maxVal = val;
      }
    }
    const safeMax = maxVal || 1; // Prevent divide by zero

    // 3. Create ImageData (The fast way)
    const imgData = ctx.createImageData(cols, rows);
    const pixels = imgData.data; // Uint8ClampedArray

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Map is typically [y][x]. Note: Canvas Y is top-down.
        // If simulation Y is bottom-up (standard physics), we read map[rows - 1 - y][x]
        // Assuming data.map matches visual layout here (index 0 is top):
        const value = map[rows - 1 - y][x]; // Flip Y for correct cartesian view
        const normalized = value / safeMax;

        // Get color from palette
        const [r, g, b] = getMagmaColor(normalized);

        // Calculate 1D array index
        const index = (y * cols + x) * 4;
        pixels[index] = r; // R
        pixels[index + 1] = g; // G
        pixels[index + 2] = b; // B
        pixels[index + 3] = 255; // Alpha (Opaque)
      }
    }

    // 4. Put image data onto canvas
    ctx.putImageData(imgData, 0, 0);

    // 5. Draw Overlay Elements (Antennas)
    // We need a second pass or a second canvas, but drawing on top works if we scale coordinates
    // Since we set canvas.width = cols, we must map physical coords to these pixels
    drawOverlays(ctx, cols, rows, data, arrayPositions);
  }, [data, arrayPositions]);

  // Helper to draw antennas on top of the heatmap
  const drawOverlays = (ctx, width, height, data, arrayPositions) => {
    if (!arrayPositions) return;

    const xMin = data.x_coords[0];
    const xMax = data.x_coords[data.x_coords.length - 1];
    const yMin = data.y_coords[0];
    const yMax = data.y_coords[data.y_coords.length - 1];

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    arrayPositions.forEach((arr, idx) => {
      ctx.fillStyle = idx === 0 ? "#00ffcc" : "#ffff00"; // Cyan vs Yellow

      arr.positions.forEach(([physX, physY]) => {
        // Convert physical units to pixel coordinates
        // X: simple ratio
        const px = ((physX - xMin) / xRange) * width;

        // Y: Canvas is top-down (0 at top), Physics is bottom-up (0 at bottom)
        // So y_pixel = height - (normalized_y * height)
        const py = height - ((physY - yMin) / yRange) * height;

        // Draw Antenna Element
        ctx.beginPath();
        ctx.arc(px, py, width * 0.015, 0, Math.PI * 2); // Dynamic size based on resolution
        ctx.fill();
      });
    });
  };

  return (
    <div className="interference-map">
      <div className="map-header">
        <h3>Field Intensity Map</h3>
        {/* Optional: Add resolution info or toggle here */}
      </div>

      <div className="canvas-wrapper" ref={wrapperRef}>
        <canvas ref={canvasRef} />

        {/* Floating Axis Labels */}
        <div className="axis-label axis-y-end">{axes.yMax.toFixed(2)}m</div>
        <div className="axis-label axis-y-start">{axes.yMin.toFixed(2)}m</div>
        <div className="axis-label axis-x-start">{axes.xMin.toFixed(2)}m</div>
        <div className="axis-label axis-x-end">{axes.xMax.toFixed(2)}m</div>
      </div>

      <div className="map-footer">
        <div className="color-legend">
          <div className="legend-gradient"></div>
          <div className="legend-labels">
            <span>-∞ dB (Null)</span>
            <span>0 dB (Max)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns [r, g, b] for a value 0.0 - 1.0 using a "Magma"-like palette.
 * This is scientifically better than simple RGB interpolation because
 * lightness increases monotonically.
 */
function getMagmaColor(t) {
  // Clamp t between 0 and 1
  t = Math.max(0, Math.min(1, t));

  // Magma-inspired Control Points (approximate)
  // 0.0: Black/Deep Blue
  // 0.3: Purple
  // 0.6: Red/Orange
  // 1.0: Yellow/White

  // We can use a simple multi-stage linear interpolation for speed
  // without needing a heavy color library.

  if (t < 0.25) {
    // Black (#000004) to Purple (#3b0f70)
    return interp(t, 0, 0.25, [0, 0, 4], [59, 15, 112]);
  } else if (t < 0.5) {
    // Purple (#3b0f70) to Red-Purple (#8c2981)
    return interp(t, 0.25, 0.5, [59, 15, 112], [140, 41, 129]);
  } else if (t < 0.75) {
    // Red-Purple (#8c2981) to Orange (#fe9f6d)
    return interp(t, 0.5, 0.75, [140, 41, 129], [254, 159, 109]);
  } else {
    // Orange (#fe9f6d) to White-Yellow (#fcfdbf)
    return interp(t, 0.75, 1.0, [254, 159, 109], [252, 253, 191]);
  }
}

// Linear Interpolation helper
function interp(val, min, max, rgb1, rgb2) {
  const ratio = (val - min) / (max - min);
  return [
    Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * ratio),
    Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * ratio),
    Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * ratio),
  ];
}
