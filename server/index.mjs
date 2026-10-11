import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { db } from './db.mjs'
import { createOrder, getOrderByCode, listOrders, publicOrderView, updateOrderStatus } from './orders.mjs'
import { HttpError, validateMessage, validateOrder } from './validate.mjs'

const PORT = Number(process.env.PORT || 3001)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const DIST = path.resolve('dist')
const MAX_BODY = 32 * 1024

// ---------- helpers ----------
const json = (res, status, data) => {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    if (!(req.headers['content-type'] || '').includes('application/json')) {
      return reject(new HttpError(415, 'Content-Type must be application/json.'))
    }
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) { reject(new HttpError(413, 'Request body too large.')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { reject(new HttpError(400, 'Invalid JSON.')) }
    })
    req.on('error', reject)
  })
}

// Tiny in-memory rate limiter (per IP + bucket). Fine for a single-process café site.
const hits = new Map()
function rateLimit(req, bucket, max, windowMs) {
  const ip = req.socket.remoteAddress || 'unknown'
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const entry = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (entry.length >= max) throw new HttpError(429, 'Too many requests. Please wait a moment and try again.')
  entry.push(now)
  hits.set(key, entry)
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600_000)) hits.delete(k) }, 600_000).unref()

function requireAdmin(req) {
  if (!ADMIN_TOKEN) throw new HttpError(503, 'Admin API is disabled. Set the ADMIN_TOKEN environment variable.')
  const header = req.headers.authorization || ''
  const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '')
  const expected = Buffer.from(ADMIN_TOKEN)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError(401, 'Unauthorized.')
  }
}

// ---------- API routes ----------
async function handleApi(req, res, url) {
  const { pathname } = url
  const method = req.method

  if (method === 'GET' && pathname === '/api/health') return json(res, 200, { ok: true })

  if (method === 'GET' && pathname === '/api/menu') {
    const items = db.prepare('SELECT id, category, name, description, price, badge, available FROM menu_items ORDER BY rowid').all()
    return json(res, 200, { items: items.map((i) => ({ ...i, available: !!i.available })) })
  }

  if (method === 'POST' && pathname === '/api/orders') {
    rateLimit(req, 'order', 10, 10 * 60_000)
    const order = createOrder(validateOrder(await readJson(req)))
    return json(res, 201, { order: publicOrderView(order) })
  }

  let m = pathname.match(/^\/api\/orders\/(KC-[A-Z0-9]{4})$/)
  if (method === 'GET' && m) {
    rateLimit(req, 'lookup', 60, 10 * 60_000)
    const order = getOrderByCode(m[1])
    if (!order) throw new HttpError(404, 'Order not found.')
    return json(res, 200, { order: publicOrderView(order) })
  }

  if (method === 'POST' && pathname === '/api/messages') {
    rateLimit(req, 'message', 5, 10 * 60_000)
    const { name, email, topic, message } = validateMessage(await readJson(req))
    db.prepare('INSERT INTO messages (name, email, topic, message) VALUES (?, ?, ?, ?)').run(name, email, topic, message)
    return json(res, 201, { ok: true })
  }

  // ----- admin (Bearer ADMIN_TOKEN) -----
  if (pathname.startsWith('/api/admin/')) {
    requireAdmin(req)

    if (method === 'GET' && pathname === '/api/admin/orders') {
      const status = url.searchParams.get('status') || undefined
      return json(res, 200, { orders: listOrders({ status }) })
    }
    m = pathname.match(/^\/api\/admin\/orders\/(\d+)$/)
    if (method === 'PATCH' && m) {
      const { status } = await readJson(req)
      return json(res, 200, { order: updateOrderStatus(Number(m[1]), status) })
    }
    if (method === 'GET' && pathname === '/api/admin/messages') {
      return json(res, 200, { messages: db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200').all() })
    }
    m = pathname.match(/^\/api\/admin\/messages\/(\d+)$/)
    if (method === 'PATCH' && m) {
      const { handled } = await readJson(req)
      const { changes } = db.prepare('UPDATE messages SET handled = ? WHERE id = ?').run(handled ? 1 : 0, Number(m[1]))
      if (!changes) throw new HttpError(404, 'Message not found.')
      return json(res, 200, { ok: true })
    }
    m = pathname.match(/^\/api\/admin\/menu\/([a-z0-9-]+)$/)
    if (method === 'PATCH' && m) {
      const body = await readJson(req)
      const row = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(m[1])
      if (!row) throw new HttpError(404, 'Menu item not found.')
      const price = body.price ?? row.price
      const available = body.available ?? !!row.available
      if (!Number.isInteger(price) || price < 0) throw new HttpError(400, 'price must be a non-negative whole number.')
      db.prepare('UPDATE menu_items SET price = ?, available = ? WHERE id = ?').run(price, available ? 1 : 0, m[1])
      return json(res, 200, { ok: true })
    }
  }

  throw new HttpError(404, 'Not found.')
}

// ---------- static files (production: serves the Vite build) ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

function serveStatic(req, res, pathname) {
  if (!existsSync(DIST)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('Frontend not built. Run `npm run build` first, or use `npm run dev` for development.')
  }
  let file = path.join(DIST, decodeURIComponent(pathname))
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end() } // path traversal guard
  if (!existsSync(file) || statSync(file).isDirectory()) file = path.join(DIST, 'index.html') // SPA fallback
  const ext = path.extname(file)
  const hashed = file.includes(`${path.sep}assets${path.sep}`)
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  createReadStream(file).pipe(res)
}

// ---------- server ----------
export const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url)
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.')
    return serveStatic(req, res, url.pathname)
  } catch (err) {
    if (err instanceof HttpError) return json(res, err.status, { error: err.message, details: err.details })
    console.error(err)
    return json(res, 500, { error: 'Something went wrong on our end. Please try again.' })
  }
})

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  server.listen(PORT, () => {
    console.log(`Kanlungan API + site running on http://localhost:${PORT}`)
    if (!ADMIN_TOKEN) console.log('Tip: set ADMIN_TOKEN to enable /api/admin/* endpoints.')
  })
}
