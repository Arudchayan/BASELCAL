/// <reference types="node" />
import fs from 'node:fs'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// Local Vercel-style helpers (plain JS)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — no types for api/*.js helpers
import { withUnicalUrl } from './api/unicalParse.js'
// @ts-expect-error — no types for api/*.js helpers
import unicalResolve from './api/unical-resolve.js'

function loadLocalStudentConfig(env: Record<string, string>): unknown {
  // Never bake a personal overlay into hosted or CI bundles.
  if (
    process.env.BASELCAL_DISABLE_STUDENT_CONFIG === '1'
    || process.env.VERCEL
    || process.env.CI
  ) {
    return null
  }
  const localPath = path.resolve('config/student.local.json')
  let config: Record<string, unknown> | null = null
  if (fs.existsSync(localPath)) {
    config = JSON.parse(fs.readFileSync(localPath, 'utf8')) as Record<string, unknown>
  }
  const unicalUrl = env.UNICAL_URL || process.env.UNICAL_URL || ''
  if (unicalUrl || config) {
    return withUnicalUrl(config, unicalUrl)
  }
  return null
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** Local stand-in for Vercel `/api/*` serverless routes during `vite` / `vite preview`. */
function localApiPlugin(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/unical-resolve') || req.method !== 'POST') {
        next()
        return
      }
      try {
        const raw = await readBody(req)
        let body: unknown = {}
        try {
          body = raw ? JSON.parse(raw) : {}
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid JSON body' }))
          return
        }
        const fakeReq = { method: 'POST', body }
        const fakeRes = {
          statusCode: 200,
          headers: {} as Record<string, string>,
          setHeader(name: string, value: string) {
            this.headers[name] = value
          },
          status(code: number) {
            this.statusCode = code
            return this
          },
          json(payload: unknown) {
            res.statusCode = this.statusCode
            for (const [k, v] of Object.entries(this.headers)) res.setHeader(k, v)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          },
        }
        await unicalResolve(fakeReq, fakeRes)
      } catch (err) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Resolve failed' }))
      }
    })
  }

  return {
    name: 'baselcal-local-api',
    configureServer(server) {
      mount(server.middlewares)
    },
    configurePreviewServer(server) {
      mount(server.middlewares)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localApiPlugin()],
    define: {
      __STUDENT_CONFIG__: JSON.stringify(loadLocalStudentConfig(env)),
    },
    server: {
      port: 5179,
      strictPort: true,
    },
    preview: {
      port: 4179,
      strictPort: true,
    },
  }
})
