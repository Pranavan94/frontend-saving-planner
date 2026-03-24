import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{jsx,tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupVitest.js'],
  },
});
