import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        // Soft, primary-tinted shadow for cards (follows the active daisyUI theme)
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 12px 32px -16px oklch(var(--p) / 0.35)",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      // Default theme (first = used when no data-theme is set): store-assistant look
      {
        lavender: {
          "primary": "#6c47ff",
          "primary-content": "#ffffff",
          "secondary": "#8b5cf6",
          "secondary-content": "#ffffff",
          "accent": "#f472b6",
          "accent-content": "#ffffff",
          "neutral": "#2a2342",
          "neutral-content": "#f5f3ff",
          "base-100": "#ffffff",
          "base-200": "#f5f3ff",
          "base-300": "#e7e1fb",
          "base-content": "#1f1a37",
          "info": "#3b82f6",
          "success": "#22c55e",
          "warning": "#f59e0b",
          "error": "#ef4444",
          "--rounded-box": "1.25rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
          "--animation-btn": "0.2s",
          "--btn-focus-scale": "0.97",
        },
      },
      "light",
      "dark",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
      
      // Add the custom themes from your UI
      {
        rumblebow: {
          "primary": "#ff6b6b",
          "secondary": "#4ecdc4",
          "accent": "#ffd166",
          "neutral": "#2d3047",
          "base-100": "#f7fff7",
        },
        windrums: {
          "primary": "#3a86ff",
          "secondary": "#8338ec",
          "accent": "#ff006e",
          "neutral": "#1a1a2e",
          "base-100": "#16213e",
        },
        disciple: {
          "primary": "#2a9d8f",
          "secondary": "#e9c46a",
          "accent": "#f4a261",
          "neutral": "#264653",
          "base-100": "#e9f5db",
        },
        crayk: {
          "primary": "#ff595e",
          "secondary": "#ffca3a",
          "accent": "#8ac926",
          "neutral": "#1982c4",
          "base-100": "#6a4c93",
        },
        auburn: {
          "primary": "#780000",
          "secondary": "#c1121f",
          "accent": "#fdf0d5",
          "neutral": "#003049",
          "base-100": "#669bbc",
        },
        den: {
          "primary": "#22577a",
          "secondary": "#38a3a5",
          "accent": "#57cc99",
          "neutral": "#80ed99",
          "base-100": "#c7f9cc",
        },
        left: {
          "primary": "#6d6875",
          "secondary": "#b5838d",
          "accent": "#e5989b",
          "neutral": "#ffb4a2",
          "base-100": "#ffcdb2",
        },
        panel: {
          "primary": "#355070",
          "secondary": "#6d597a",
          "accent": "#b56576",
          "neutral": "#e56b6f",
          "base-100": "#eaac8b",
        },
        next: {
          "primary": "#000000",
          "secondary": "#ffffff",
          "accent": "#0070f3",
          "neutral": "#fafafa",
          "base-100": "#ffffff",
        }
      }
    ],
  },
};