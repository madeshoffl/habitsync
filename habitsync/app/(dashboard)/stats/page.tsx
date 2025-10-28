"use client";

import { useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Line, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export default function StatsPage() {
  const weeklyData = [65, 70, 80, 75, 85, 90, 88];

  const lineData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      label: "Completion %",
      data: weeklyData,
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.15)",
      tension: 0.35,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 5,
    }],
  };

  const lineOptions = {
    responsive: true,
    plugins: { legend: { display: true }, tooltip: { enabled: true } },
    scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } },
  } as const;

  const pieData = {
    labels: ["Health", "Productivity", "Learning", "Lifestyle"],
    datasets: [{
      data: [3, 2, 1, 1],
      backgroundColor: ["#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4"],
      borderColor: "#ffffff",
      borderWidth: 2,
    }],
  };

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold text-gray-900 sm:text-2xl">Your Progress</h2>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Total habits tracked</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">7</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Best streak</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">21 days</div>
          <div className="text-xs text-gray-500">Reading</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Habits completed this week</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">18</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Current level</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">2</div>
          <div className="text-xs text-gray-500">(based on XP)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium text-gray-700">Weekly Completion Rate</div>
          <Line data={lineData} options={lineOptions} height={120} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium text-gray-700">Habits by Category</div>
          <Pie data={pieData} />
        </div>
      </div>
    </>
  );
}

