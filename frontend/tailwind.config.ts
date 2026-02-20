import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors"; // 1. Import default colors
export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
      fontFamily: {
        mulish: [
          "Mulish",
          "sans-serif"
        ],
      },
      colors: {
        "customGray": "rgba(154, 154, 154, 0.44)",
        "primary": colors.gray[200],   // This makes 'bg-primary' effectively 'bg-gray-200'
        "secondary": 'rgba(255, 255, 255, 0.1)',
        "tertiary": colors.neutral[900]
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require('tailwind-scrollbar')({ nocompatible: true }), require("@tailwindcss/typography")]
} satisfies Config;
