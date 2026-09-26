import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tailwind + autoprefixer are loaded from postcss.config.js
export default defineConfig({
  plugins: [react()],
});
