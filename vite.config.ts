import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function loadLocalStudentConfig(): unknown {
  // Never bake a personal overlay into hosted or CI bundles.
  if (
    process.env.BASELCAL_DISABLE_STUDENT_CONFIG === '1'
    || process.env.VERCEL
    || process.env.CI
  ) {
    return null
  }
  const localPath = path.resolve('config/student.local.json')
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'))
  }
  return null
}

export default defineConfig({
  plugins: [react()],
  define: {
    __STUDENT_CONFIG__: JSON.stringify(loadLocalStudentConfig()),
  },
  server: {
    port: 5179,
    strictPort: true,
  },
  preview: {
    port: 4179,
    strictPort: true,
  },
})
