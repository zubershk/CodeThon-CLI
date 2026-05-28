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
        backdrop: "#0a0a0f",
        surface: "#12121a",
        "surface-elevated": "#1a1a28",
        border: "#1e1e30",
        cyan: { 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2" },
        purple: { 400: "#c084fc", 500: "#a855f7", 600: "#7c3aed" },
        green: { 400: "#4ade80", 500: "#22c55e" },
        muted: "#8888a0",
        "muted-light": "#a0a0b8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "slide-up": "slideUp 0.8s ease-out forwards",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "terminal-blink": "blink 1s step-end infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "float": "float 6s ease-in-out infinite",
        "grid-flow": "gridFlow 20s linear infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        glowPulse: { "0%, 100%": { opacity: "0.4" }, "50%": { opacity: "1" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
        gradientShift: { "0%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" }, "100%": { backgroundPosition: "0% 50%" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        gridFlow: { "0%": { transform: "translateY(0)" }, "100%": { transform: "translateY(-50%)" } },
      },
    },
  },
  plugins: [],
};
export default config;
