import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        iba: {
          navy: "#1A365D",
          dark: "#0F172A",
          light: "#2B4C7E",
          teal: "#0D9488",
          gold: "#B45309",
          slate: "#F8FAFC"
        },
        primary: {
          DEFAULT: "#1A365D",
          hover: "#152c4b",
          light: "#2B4C7E"
        },
        accent: {
          DEFAULT: "#0D9488",
          hover: "#0f766e"
        },
        gold: {
          DEFAULT: "#B45309",
          light: "#F59E0B"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"]
      }
    },
  },
  plugins: [],
};

export default config;
