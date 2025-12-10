import React, { useRef, useEffect } from "react";
import "./InterferenceMap.css";

export function InterferenceMap({ data, arrayPositions }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || !data.map || !data.map.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const map = data.map;
    const rows = map.length;
    const cols = map[0]?.length || 0;

    if (rows === 0 || cols === 0) return;

    // Find min and max for normalization
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const val = map[i][j];
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    // Normalize and draw
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const val = map[i][j];
        const normalized = (val - min) / (max - min);
        const color = getHeatmapColor(normalized);

        ctx.fillStyle = color;
        ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight);
      }
    }

    // Draw array positions
    if (arrayPositions && arrayPositions.length > 0) {
      const xMin = data.x_coords[0];
      const xMax = data.x_coords[data.x_coords.length - 1];
      const yMin = data.y_coords[0];
      const yMax = data.y_coords[data.y_coords.length - 1];

      arrayPositions.forEach((arrayData, arrayIdx) => {
        const positions = arrayData.positions;
        ctx.fillStyle = arrayIdx === 0 ? "#ffffff" : "#ffff00";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;

        positions.forEach(([x, y]) => {
          const canvasX = ((x - xMin) / (xMax - xMin)) * width;
          const canvasY = ((y - yMin) / (yMax - yMin)) * height;

          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        });
      });
    }

    // Draw axes
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#000000";

    // X axis
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();
    ctx.fillText(`X: ${data.x_coords[0]?.toFixed(2) || 0}`, 10, height - 5);
    ctx.fillText(
      `X: ${data.x_coords[data.x_coords.length - 1]?.toFixed(2) || 0}`,
      width - 60,
      height - 5
    );

    // Y axis
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(20, height - 20);
    ctx.stroke();
    ctx.save();
    ctx.translate(5, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(
      `Y: ${data.y_coords[data.y_coords.length - 1]?.toFixed(2) || 0}`,
      0,
      0
    );
    ctx.restore();
    ctx.fillText(`Y: ${data.y_coords[0]?.toFixed(2) || 0}`, 5, height - 25);
  }, [data, arrayPositions]);

  function getHeatmapColor(value) {
    // value is 0 to 1
    if (value < 0.25) {
      const t = value / 0.25;
      return interpolateColor("#0f172a", "#22d3ee", t);
    } else if (value < 0.5) {
      const t = (value - 0.25) / 0.25;
      return interpolateColor("#22d3ee", "#10b981", t);
    } else if (value < 0.75) {
      const t = (value - 0.5) / 0.25;
      return interpolateColor("#10b981", "#fbbf24", t);
    } else {
      const t = (value - 0.75) / 0.25;
      return interpolateColor("#fbbf24", "#ef4444", t);
    }
  }

  function interpolateColor(color1, color2, t) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  return (
    <div className="interference-map">
      <h3>Constructive/Destructive Interference Map</h3>
      <div className="canvas-container">
        <canvas ref={canvasRef} width={600} height={100}></canvas>
        
      </div>
      <div className="color-legend">
        <span>Min</span>
        <div className="legend-gradient"></div>
        <span>Max</span>
      </div>
    </div>
  );
}
