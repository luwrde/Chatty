import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
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