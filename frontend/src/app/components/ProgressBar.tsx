import React from "react";

interface CircularLoaderProps {
    progress: number; // Progress percentage (0 to 100)
    text: string;     // Text to display inside the loader
}

const CircularLoader: React.FC<CircularLoaderProps> = ({ progress, text }) => {
    const radius = 50; // Radius of the circle
    const strokeWidth = 8; // Width of the stroke
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    // Calculate the cap's position
    const centerX = 60; // SVG center (x)
    const centerY = 60; // SVG center (y)
    const angle = (progress / 100) * 2 * Math.PI; // Progress angle in radians
    const capX = centerX + radius * Math.cos(angle - Math.PI / 2); // Cap X position
    const capY = centerY + radius * Math.sin(angle - Math.PI / 2); // Cap Y position

    return (
        <div className="relative w-[140px] h-[140px] flex items-center justify-center">
            {/* SVG Background Circle */}
            <svg className="absolute w-full h-full">
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="#333" // Background circle color
                    strokeWidth={strokeWidth}
                />
            </svg>

            {/* SVG Progress Circle */}
            <svg className="absolute w-full h-full -rotate-90">
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="url(#gradient)" // Progress gradient
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="gradient" x1="1" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6A3D" />
                        <stop offset="100%" stopColor="#FF3CAC" />
                    </linearGradient>
                </defs>

                {/* Progress Cap */}
                <circle
                    cx={capX}
                    cy={capY}
                    r={6} // Cap size
                    fill="#FF6A3D"
                />
            </svg>

            {/* Centered Text */}
            <div className="absolute text-center">
                <p className="text-sm text-gray-400">{text}</p>
                <p className="text-2xl text-white font-bold">{progress}s</p>
            </div>
        </div>
    );
};

export default CircularLoader;
