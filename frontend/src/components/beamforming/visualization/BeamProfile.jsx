import React, { useRef, useEffect } from "react";
import "../../../styles/BeamProfile.css";

export function BeamProfile({ data, arrays }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || !data.angles || !data.combined) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height - 40;
    const maxRadius = Math.min(width / 2, height) - 60;

    // Gather every gain value so we can scale correctly even if they’re all negative.
    const allValues = [];
    if (data.combined) allValues.push(...data.combined);
    if (data.individual && arrays) {
      arrays.forEach((array) => {
        if (data.individual[array.id])
          allValues.push(...data.individual[array.id]);
      });
    }

    const finiteValues = allValues.filter((v) => Number.isFinite(v));
    const maxGain = finiteValues.length ? Math.max(...finiteValues) : 1;
    const minGain = finiteValues.length ? Math.min(...finiteValues) : 0;
    const spread = maxGain - minGain || 1;

    const normalize = (value) =>
      Math.min(1, Math.max(0, (value - minGain) / spread));

    const gridColor = "#334155";
    const textColor = "#94a3b8";
    const patternColor = "#3b82f6";
    const patternFill = "rgba(59, 130, 246, 0.2)";
    const radialFractions = [0, 0.2, 0.4, 0.6, 0.8, 1];

    ctx.font =
      '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Upper semicircles
    radialFractions.slice(1).forEach((fraction) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, fraction * maxRadius, Math.PI, 0);
      ctx.strokeStyle = gridColor;
      ctx.stroke();
    });

    // Baseline diameter
    ctx.beginPath();
    ctx.moveTo(centerX - maxRadius - 20, centerY);
    ctx.lineTo(centerX + maxRadius + 20, centerY);
    ctx.strokeStyle = gridColor;
    ctx.stroke();

    // Range labels (0 centered, mirrored on both sides)
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    radialFractions.forEach((fraction) => {
      const dist = fraction * maxRadius;
      const label = fraction.toFixed(1).replace(/\.0$/, "");
      if (fraction === 0) {
        ctx.fillText(label, centerX, centerY + 6);
      } else {
        ctx.fillText(label, centerX + dist, centerY + 6);
        ctx.fillText(label, centerX - dist, centerY + 6);
      }
    });

    // Angle spokes + labels
    const angleLabels = [-90, -60, -30, 0, 30, 60, 90];
    angleLabels.forEach((angleDeg) => {
      const angleRad = ((angleDeg - 90) * Math.PI) / 180;
      const x = centerX + maxRadius * Math.cos(angleRad);
      const y = centerY + maxRadius * Math.sin(angleRad);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = gridColor;
      ctx.stroke();

      const labelRadius = maxRadius + 18;
      const labelX = centerX + labelRadius * Math.cos(angleRad);
      const labelY = centerY + labelRadius * Math.sin(angleRad);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${angleDeg}°`, labelX, labelY);
    });

    const drawPattern = (
      patternData,
      strokeColor,
      fillColor,
      lineWidth = 2,
      dashed = false
    ) => {
      if (!patternData) return;

      const points = [];
      patternData.forEach((value, i) => {
        const angleDeg = data.angles[i];
        if (angleDeg < -90 || angleDeg > 90) return;

        const angleRad = ((angleDeg - 90) * Math.PI) / 180;
        const radius = normalize(value) * maxRadius;
        const x = centerX + radius * Math.cos(angleRad);
        const y = centerY + radius * Math.sin(angleRad);
        points.push({ x, y });
      });

      if (!points.length) return;

      if (fillColor) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
      }

      ctx.setLineDash(dashed ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (data.individual && arrays) {
      const colors = ["#10b981", "#f59e0b", "#ec4899"];
      arrays.forEach((array, idx) => {
        drawPattern(
          data.individual[array.id],
          colors[idx % colors.length],
          null,
          1,
          true
        );
      });
    }

    drawPattern(data.combined, patternColor, patternFill, 2, false);
  }, [data, arrays]);

  if (!data || !data.angles) return <div className="no-data">No Data</div>;

  return (
    <div
      className="beam-profile-container"
      style={{ width: "100%", height: "100%" }}
    >
      <canvas
        ref={canvasRef}
        width={400}
        height={280}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
