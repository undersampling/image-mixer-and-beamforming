import React, { useRef, useEffect } from "react";
import "../../../styles/ArrayDiagram.css"; // Ensure this file exists, even if empty


export function ArrayDiagram({ arrayPositions, config }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!arrayPositions?.length || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // 1. Responsive Sizing
    // Make canvas match container pixel-perfectly
    const { width, height } = containerRef.current.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // Clear with dark background
    ctx.fillStyle = "#0f172a"; // Match dashboard bg (optional, or transparent)
    ctx.clearRect(0, 0, width, height);

    // 2. Calculate Scale & Bounds
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    arrayPositions.forEach(({ positions }) => {
      positions.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    });

    // Add 20% padding so elements aren't on edge
    const rangeX = maxX - minX || 0.1;
    const rangeY = maxY - minY || 0.1;
    const padX = rangeX * 0.2;
    const padY = rangeY * 0.2;

    // Viewport bounds
    const vMinX = minX - padX;
    const vMaxX = maxX + padX;
    const vMinY = minY - padY;
    const vMaxY = maxY + padY;

    // Scaling factors
    const scaleX = width / (vMaxX - vMinX);
    const scaleY = height / (vMaxY - vMinY);
    const scale = Math.min(scaleX, scaleY); // Uniform scale

    // Centering offsets
    const contentWidth = (vMaxX - vMinX) * scale;
    const contentHeight = (vMaxY - vMinY) * scale;
    const offsetX = (width - contentWidth) / 2;
    const offsetY = (height - contentHeight) / 2;

    // Coordinate Transform: Physics -> Screen
    // Note: Physics Y is usually up, Screen Y is down. We flip Y.
    const toScreenX = (x) => (x - vMinX) * scale + offsetX;
    const toScreenY = (y) => height - ((y - vMinY) * scale + offsetY); // Flip Y

    // 3. Draw Grid (Blueprint style)
    ctx.strokeStyle = "#1e293b"; // Very subtle grid
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = width * (i / 10);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = height * (i / 10);
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 4. Draw Array Elements
    const colors = ["#22d3ee", "#f472b6", "#fbbf24"]; // Cyan, Pink, Amber

    arrayPositions.forEach((arr, idx) => {
      const color = colors[idx % colors.length];

      // Draw Connector Line (Phased Array Backplane)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      // Simple line through all points
      if (arr.positions.length > 0) {
        const first = arr.positions[0];
        const last = arr.positions[arr.positions.length - 1];
        ctx.moveTo(toScreenX(first[0]), toScreenY(first[1]));
        ctx.lineTo(toScreenX(last[0]), toScreenY(last[1]));
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw Elements (LED style)
      ctx.fillStyle = "#0f172a"; // Inner black
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      arr.positions.forEach(([x, y]) => {
        const sx = toScreenX(x);
        const sy = toScreenY(y);

        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glow effect center
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a"; // Reset
      });

      // Draw Steering Vector (Arrow)
      // We look up the steering angle from config if available
      const arrayConfig = config?.arrays?.find((a) => a.id === arr.id);
      if (arrayConfig && !arrayConfig.focus_point) {
        const angleRad = (arrayConfig.steering_angle || 0) * (Math.PI / 180);

        // Calculate center of array
        const cx = toScreenX(
          arr.positions[Math.floor(arr.positions.length / 2)][0]
        );
        const cy = toScreenY(
          arr.positions[Math.floor(arr.positions.length / 2)][1]
        );

        // Arrow Length (fixed pixels)
        const len = 40;
        // Physics angle 0 is usually "Up" or "Right" depending on convention.
        // Assuming 0 is straight up (Y+):
        const ex = cx + Math.sin(angleRad) * len;
        const ey = cy - Math.cos(angleRad) * len; // Subtract because screen Y is flipped

        ctx.strokeStyle = color;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }, [arrayPositions, config]);

  return (
    <div
      className="array-diagram-wrapper"
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
