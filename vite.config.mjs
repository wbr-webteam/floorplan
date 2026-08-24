import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the same build works under Render's root domain
// and GitHub Pages' /floorplan/ subpath without an env-flag switch.
export default defineConfig({
  base: './',
  plugins: [react()],
});
