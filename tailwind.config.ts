import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-bg": "rgb(var(--bg-primary) / <alpha-value>)",
        "surface-1": "rgb(var(--bg-surface-1) / <alpha-value>)",
        "surface-2": "rgb(var(--bg-surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--bg-surface-3) / <alpha-value>)",
        "primary": "rgb(var(--text-primary) / <alpha-value>)",
        "secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "tertiary": "rgb(var(--text-tertiary) / <alpha-value>)",
        "accent-primary": "rgb(var(--accent-primary) / <alpha-value>)",
        "accent-secondary": "rgb(var(--accent-secondary) / <alpha-value>)",
        "accent-hover": "rgb(var(--accent-hover) / <alpha-value>)",
        "border-primary": "rgb(var(--border-primary) / <alpha-value>)",
        "border-highlight": "rgb(var(--border-highlight) / <alpha-value>)",
        "status-success": "rgb(var(--status-success) / <alpha-value>)",
        "status-warning": "rgb(var(--status-warning) / <alpha-value>)",
        "status-error": "rgb(var(--status-error) / <alpha-value>)",
        "status-info": "rgb(var(--status-info) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-outfit)", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass": "linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
      },
      boxShadow: {
        "glow": "0 0 20px rgba(14, 165, 233, 0.15)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
};

export default config;
