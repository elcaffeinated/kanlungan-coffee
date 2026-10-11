import { randomInt } from 'node:crypto'
import { db, transaction } from './db.mjs'
import { STUDENT_DISCOUNT_CATEGORY, STUDENT_DISCOUNT_RATE } from './menu.mjs'
import { HttpError } from './validate.mjs'

export const STATUSES = ['received', 'preparing', 'ready', 'completed', 'cancelled']
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L to avoid mixups at the counter

const newCode = () => 'KC-' + Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')

export function createOrder({ pickupName, mobile, note, items, studentDiscount }) {
  const ids = Object.keys(items)
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`SELECT * FROM menu_items WHERE id IN (${placeholders})`).all(...ids)
  const byId = new Map(rows.map((r) => [r.id, r]))

  const unknown = ids.filter((id) => !byId.has(id))
  if (unknown.length) throw new HttpError(400, 'Some items are not on our menu.', { items: `Unknown item(s): ${unknown.join(', ')}` })
  const unavailable = rows.filter((r) => !r.available).map((r) => r.name)
  if (unavailable.length) throw new HttpError(409, `Sorry, currently unavailable: ${unavailable.join(', ')}.`)

  let subtotal = 0
  let eligible = 0
  for (const id of ids) {
    const line = byId.get(id).price * items[id]
    subtotal += line
    if (byId.get(id).category === STUDENT_DISCOUNT_CATEGORY) eligible += line
  }
  const discount = studentDiscount ? Math.round(eligible * STUDENT_DISCOUNT_RATE) : 0
  const total = subtotal - discount

  return transaction(() => {
    let code
    for (let i = 0; i < 10; i++) {
      const candidate = newCode()
      if (!db.prepare('SELECT 1 FROM orders WHERE code = ?').get(candidate)) { code = candidate; break }
    }
    if (!code) throw new HttpError(503, 'Could not generate an order code. Please try again.')

    const { lastInsertRowid } = db
      .prepare(`INSERT INTO orders (code, pickup_name, mobile, note, student_discount, subtotal, discount, total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(code, pickupName, mobile, note, studentDiscount ? 1 : 0, subtotal, discount, total)

    const insertLine = db.prepare(
      'INSERT INTO order_items (order_id, item_id, name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)',
    )
    for (const id of ids) insertLine.run(lastInsertRowid, id, byId.get(id).name, byId.get(id).price, items[id])

    return getOrderById(Number(lastInsertRowid))
  })
}

function hydrate(order) {
  if (!order) return null
  const lines = db
    .prepare('SELECT item_id AS itemId, name, unit_price AS unitPrice, quantity FROM order_items WHERE order_id = ? ORDER BY id')
    .all(order.id)
  return {
    id: order.id,
    code: order.code,
    pickupName: order.pickup_name,
    mobile: order.mobile,
    note: order.note,
    studentDiscount: !!order.student_discount,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: lines,
  }
}

export const getOrderById = (id) => hydrate(db.prepare('SELECT * FROM orders WHERE id = ?').get(id))
export const getOrderByCode = (code) => hydrate(db.prepare('SELECT * FROM orders WHERE code = ?').get(code))

export function listOrders({ status, limit = 100 } = {}) {
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(limit)
  return rows.map(hydrate)
}

export function updateOrderStatus(id, status) {
  if (!STATUSES.includes(status)) throw new HttpError(400, `Status must be one of: ${STATUSES.join(', ')}.`)
  const { changes } = db
    .prepare(`UPDATE orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
    .run(status, id)
  if (!changes) throw new HttpError(404, 'Order not found.')
  return getOrderById(id)
}

/** What a customer is allowed to see when looking up their own order by code (no phone number). */
export const publicOrderView = (o) => ({
  code: o.code,
  pickupName: o.pickupName,
  status: o.status,
  subtotal: o.subtotal,
  discount: o.discount,
  total: o.total,
  createdAt: o.createdAt,
  items: o.items,
})
