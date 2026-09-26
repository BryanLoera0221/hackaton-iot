import type { Config } from "tailwindcss";

/**
 * Los mismos tokens del sistema Industry + las dos severidades funcionales,
 * espejados aquí para que cualquier utilidad de Tailwind que agregues quede
 * en paleta. La fuente de verdad son las variables CSS de
 * src/styles/industry.css y src/styles/fallguard.css.
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f2f2f3",
        surface: "#e9e9ea",
        ink: "#1d1f20",
        accent: {
          DEFAULT: "#5980a6",
          100: "#eef6ff",
          500: "#749dc4",
          600: "#597ea3",
          700: "#416180",
          800: "#2c455d",
          900: "#1d2d3d",
        },
        neutral: {
          600: "#7a7a7d",
          700: "#5d5d60",
          800: "#424244",
        },
        fall: {
          DEFAULT: "#b3261e",
          deep: "#7a1712",
          tint: "#fbe8e6",
        },
        exit: {
          DEFAULT: "#b7791f",
          hatch: "#f6e6c4",
          "hatch-2": "#fbf3e2",
          text: "#6e4a0e",
          "text-2": "#4a3208",
        },
      },
      borderRadius: {
        none: "0",
      },
      fontFamily: {
        sans: ["Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Barlow Condensed", "Arial Narrow", "ui-sans-serif", "sans-serif"],
      },
      keyframes: {
        fgPulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(179,38,30,.55)" },
          "70%": { boxShadow: "0 0 0 16px rgba(179,38,30,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(179,38,30,0)" },
        },
      },
      animation: {
        "fg-pulse": "fgPulse 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
