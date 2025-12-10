import React, { useRef, useEffect } from "react";
import "./ArrayDiagram.css";

export function ArrayDiagram({ arrayPositions, config }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!arrayPositions || arrayPositions.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find bounds
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    arrayPositions.forEach(({ positions }) => {
      positions.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    });

    // Add padding
    const padding = 0.1;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    minX -= rangeX * padding;
    maxX += rangeX * padding;
    minY -= rangeY * padding;
    maxY += rangeY * padding;

    const scaleX = width / (maxX - minX);
    const scaleY = height / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - (maxX - minX) * scale) / 2;
    const offsetY = (height - (maxY - minY) * scale) / 2;

    const toCanvasX = (x) => (x - minX) * scale + offsetX;
    const toCanvasY = (y) => (y - minY) * scale + offsetY;

    // Draw axes
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // X axis
    if (minY <= 0 && maxY >= 0) {
      const y0 = toCanvasY(0);
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(width, y0);
      ctx.stroke();
    }

    // Y axis
    if (minX <= 0 && maxX >= 0) {
      const x0 = toCanvasX(0);
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, height);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw arrays
    const colors = ["#10b981", "#14b8a6", "#f472b6", "#fbbf24"];
    const arrayNames = config?.arrays?.map((a) => a.name) || [];

    arrayPositions.forEach((arrayData, arrayIdx) => {
      const positions = arrayData.positions;
      const color = colors[arrayIdx % colors.length];

      // Draw steering direction if available
      const array = config?.arrays?.find((a) => a.id === arrayData.id);
      if (array && array.steering_angle !== undefined && !array.focus_point) {
        const centerX =
          positions.reduce((sum, [x]) => sum + x, 0) / positions.length;
        const centerY =
          positions.reduce((sum, [, y]) => sum + y, 0) / positions.length;
        const angle = (array.steering_angle * Math.PI) / 180;
        const length = 30;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toCanvasX(centerX), toCanvasY(centerY));
        ctx.lineTo(
          toCanvasX(centerX + (length * Math.sin(angle)) / scale),
          toCanvasY(centerY + (length * Math.cos(angle)) / scale)
        );
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          toCanvasX(centerX + (length * Math.sin(angle)) / scale),
          toCanvasY(centerY + (length * Math.cos(angle)) / scale),
          3,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }

      // Draw elements
      ctx.fillStyle = color;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;

      positions.forEach(([x, y]) => {
        const canvasX = toCanvasX(x);
        const canvasY = toCanvasY(y);

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      });
    });

    // Draw legend
    ctx.fillStyle = "#000000";
    ctx.font = "12px sans-serif";
    let legendY = 20;
    arrayPositions.forEach((arrayData, arrayIdx) => {
      const color = colors[arrayIdx % colors.length];
      const name = arrayNames[arrayIdx] || `Array ${arrayIdx + 1}`;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(20, legendY, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#000000"; // Keep text black for now, or update if background is dark?
      // Wait, ArrayDiagram background is white in CSS?
      // .array-diagram .canvas-container { background: white; }
      // So black text is fine.
      ctx.fillText(name, 35, legendY + 4);
      legendY += 20;
    });
  }, [arrayPositions, config]);

  return (
    <div className="array-diagram">
      <h3>Array Elements</h3>
      <div className="canvas-container">
        <canvas ref={canvasRef} width={600} height={150}></canvas>
      </div>
    </div>
  );
}
