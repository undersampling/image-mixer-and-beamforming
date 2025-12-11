import React from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import "./BeamProfile.css";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export function BeamProfile({ data, arrays }) {
  if (!data || !data.angles) return <div className="no-data">No Data</div>;

  const datasets = [];
  
  // 1. Combined Pattern (The most important one)
  if (data.combined) {
    datasets.push({
      label: "Total Pattern",
      data: data.combined,
      borderColor: "#3b82f6", // Blue
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      order: 1, // Draw on top
    });
  }

  // 2. Individual Patterns (Subtle lines)
  if (data.individual && arrays) {
    const colors = ["#10b981", "#f59e0b", "#ec4899"];
    arrays.forEach((array, idx) => {
      if (data.individual[array.id]) {
        datasets.push({
          label: array.name,
          data: data.individual[array.id],
          borderColor: colors[idx % colors.length],
          backgroundColor: "transparent", // Don't fill individual
          borderWidth: 1,
          borderDash: [4, 4], // Dashed lines for individual
          pointRadius: 0,
          order: 2,
        });
      }
    });
  }

  // Polar labels
  const labels = data.angles.map((a, i) => (i % 45 === 0 ? `${a}°` : ""));

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Fits container
    scales: {
      r: {
        angleLines: { color: "#334155" }, // Dark grid lines
        grid: { color: "#334155" },
        pointLabels: { 
          color: "#94a3b8", // Light text
          font: { size: 10 } 
        },
        ticks: { display: false }, // Hide scale numbers (clutter)
      },
    },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: { 
          color: "#cbd5e1",
          boxWidth: 8,
          font: { size: 10 }
        }
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#e2e8f0",
        bodyColor: "#cbd5e1",
        borderColor: "#475569",
        borderWidth: 1,
      }
    },
    animation: { duration: 0 } // Disable animation for real-time performance
  };

  return (
    <div className="beam-profile-container" style={{ width: '100%', height: '100%' }}>
      <Radar data={{ labels, datasets }} options={options} />
    </div>
  );
}