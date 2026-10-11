export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

const clean = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim() : '')

export const MESSAGE_TOPICS = ['General inquiry', 'Group reservation', 'Campus collaboration', 'Feedback']
export const MAX_LINE_QTY = 20
export const MAX_TOTAL_QTY = 50

/** Normalizes PH mobile numbers to 09XXXXXXXXX. Accepts 09.., +639.., 639.., spaces/dashes. */
export function normalizeMobile(raw) {
  const digits = clean(raw).replace(/[\s\-().]/g, '')
  let m = digits
  if (m.startsWith('+63')) m = '0' + m.slice(3)
  else if (m.startsWith('63') && m.length === 12) m = '0' + m.slice(2)
  return /^09\d{9}$/.test(m) ? m : null
}

export function validateOrder(body) {
  const errors = {}
  const pickupName = clean(body?.pickupName)
  if (!pickupName || pickupName.length > 60) errors.pickupName = 'Pickup name is required (max 60 characters).'

  const mobile = normalizeMobile(body?.mobile)
  if (!mobile) errors.mobile = 'Enter a valid PH mobile number, e.g. 0917 123 4567.'

  const note = clean(body?.note)
  if (note.length > 200) errors.note = 'Note must be 200 characters or fewer.'

  const items = {}
  let totalQty = 0
  const raw = body?.items
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.items = 'Order items are required.'
  } else {
    for (const [id, qty] of Object.entries(raw)) {
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) {
        errors.items = `Each item quantity must be a whole number from 1 to ${MAX_LINE_QTY}.`
        break
      }
      items[id] = qty
      totalQty += qty
    }
    if (!errors.items && totalQty === 0) errors.items = 'Your basket is empty.'
    if (!errors.items && totalQty > MAX_TOTAL_QTY) errors.items = `Orders are limited to ${MAX_TOTAL_QTY} items. For bigger groups, send us a message.`
  }

  if (Object.keys(errors).length) throw new HttpError(400, 'Please check your order.', errors)
  return { pickupName, mobile, note: note || null, items, studentDiscount: body?.studentDiscount === true }
}

export function validateMessage(body) {
  const errors = {}
  const name = clean(body?.name)
  const email = clean(body?.email)
  const topic = clean(body?.topic)
  const message = clean(body?.message)

  if (!name || name.length > 80) errors.name = 'Name is required (max 80 characters).'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) errors.email = 'Enter a valid email address.'
  if (topic && !MESSAGE_TOPICS.includes(topic)) errors.topic = 'Unknown topic.'
  if (!message || message.length > 2000) errors.message = 'Message is required (max 2000 characters).'

  if (Object.keys(errors).length) throw new HttpError(400, 'Please check your message.', errors)
  return { name, email, topic: topic || null, message }
}
