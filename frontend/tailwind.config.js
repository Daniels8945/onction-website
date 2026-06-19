/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Onction navy / teal brand system
        navy: {
          950: "#06121F",
          900: "#0A1F3C",
          800: "#0F2A52",
          700: "#163668",
        },
        teal: {
          400: "#2DD4BF",
          500: "#13C2B6",
          600: "#0FB5A6",
          700: "#0B8F84",
        },
        spark: {
          // warm amber accent — gas / energy, used sparingly
          400: "#F7B955",
          500: "#F5A623",
        },
        ink: "#1B2A3D",
        slatey: "#5B6B80",
        mist: "#F6F8FA",
      },
      fontFamily: {
        display: ['"Syne"', "system-ui", "sans-serif"],
        body: ['"Outfit"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
        heading: ['"Outfit"', "system-ui", "sans-serif"],
        outfit: ['"Outfit"', "system-ui", "sans-serif"],
      },
      maxWidth: {
        wrap: "1600px",
      },
      keyframes: {
        current: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        current: "current 6s linear infinite",
        fadeUp: "fadeUp 0.7s ease forwards",
        pulseDot: "pulseDot 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
