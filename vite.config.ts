import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function loadStudentConfig(mode: string): unknown {
  if (process.env.BASELCAL_DISABLE_STUDENT_CONFIG === '1') return null

  const env = loadEnv(mode, process.cwd(), '')
  const fromEnv = process.env.STUDENT_CONFIG || env.STUDENT_CONFIG
  if (fromEnv && fromEnv.trim()) {
    try {
      return JSON.parse(fromEnv)
    } catch {
      throw new Error('STUDENT_CONFIG must be valid JSON')
    }
  }

  const localPath = path.resolve('config/student.local.json')
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'))
  }
  return null
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __STUDENT_CONFIG__: JSON.stringify(loadStudentConfig(mode)),
  },
  server: {
    port: 5179,
    strictPort: true,
  },
  preview: {
    port: 4179,
    strictPort: true,
  },
}))
