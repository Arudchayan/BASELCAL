import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dedicated port so Playwright does not reuse another app on 5173
    port: 5179,
    strictPort: true,
  },
  preview: {
    port: 4179,
    strictPort: true,
  },
})
