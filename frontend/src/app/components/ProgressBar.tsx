import React from "react";

interface GradientCircularLoaderProps {
  progress: number;
}

const GradientCircularLoader: React.FC<GradientCircularLoaderProps> = ({ progress }) => {
  // Calculate progress in terms of stroke-dashoffset
  const radius = 45; // Radius of the circle
  const circumference = 2 * Math.PI * radius; // Circumference of the circle
  const offset = circumference - (progress / 100) * circumference; // Calculate the offset for progress

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Gradient Circle Progress */}
      <svg
        className="absolute transform rotate-90"
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
      >
        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#222"
          strokeWidth="8"
        />
        {/* Progress Circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.5s ease-in-out", // Smooth transition
          }}
        />
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="gradient" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" /> {/* Blue */}
            <stop offset="50%" stopColor="#9333ea" /> {/* Purple */}
            <stop offset="100%" stopColor="#f43f5e" /> {/* Red */}
          </linearGradient>
        </defs>
      </svg>

      {/* Inner Circle */}
      <div className="absolute inset-[4px] bg-gray-900 rounded-full flex items-center justify-center">
        {/* Play Button */}
        {/* <div className="w-0 h-0 border-t-[10px] border-b-[10px] border-l-[15px] border-l-white border-t-transparent border-b-transparent"></div> */}
      </div>
    </div>
  );
};

export default GradientCircularLoader;

