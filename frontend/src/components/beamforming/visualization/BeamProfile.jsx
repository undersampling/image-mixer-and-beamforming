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
  if (!data || !data.angles || data.angles.length === 0) {
    return (
      <div className="beam-profile">
        <h3>Beam Pattern (Polar)</h3>
        <div className="no-data">No beam profile data available</div>
      </div>
    );
  }

  const datasets = [];

  // Add individual array patterns
  if (data.individual && arrays) {
    const colors = ["#10b981", "#14b8a6", "#f472b6", "#fbbf24"];
    arrays.forEach((array, idx) => {
      if (data.individual[array.id]) {
        datasets.push({
          label: array.name,
          data: data.individual[array.id],
          borderColor: colors[idx % colors.length],
          backgroundColor: colors[idx % colors.length] + "33",
          borderWidth: 2,
        });
      }
    });
  }

  // Add combined pattern
  if (data.combined && data.combined.length > 0) {
    datasets.push({
      label: "Combined",
      data: data.combined,
      borderColor: "#ef4444",
      backgroundColor: "#ef444433",
      borderWidth: 3,
      borderDash: [5, 5],
    });
  }

  // Convert angles to radians for polar chart
  const labels = data.angles.map((angle) => {
    if (angle === -90) return "270°";
    if (angle === 90) return "90°";
    if (angle === 0) return "0°";
    if (angle === 180) return "180°";
    return `${angle}°`;
  });

  const chartData = {
    labels: labels,
    datasets: datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          display: false,
        },
        pointLabels: {
          font: {
            size: 10,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  return (
    <div className="beam-profile">
      <h3>Beam Pattern (Polar)</h3>
      <div className="chart-container">
        <Radar data={chartData} options={options} />
      </div>
    </div>
  );
}
