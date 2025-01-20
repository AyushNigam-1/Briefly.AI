import type { Config } from "tailwindcss";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require('tailwind-scrollbar')],
  variants: {
    scrollbar: ['rounded'],
  }
};
export default config;
