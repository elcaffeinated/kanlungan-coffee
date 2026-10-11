// All data access for the site lives here.
//
// Default ("static") mode: products and customers are fetched (GET) from the JSON files in /public.
//   - Contact + order forms are delivered by Formspree if VITE_FORMSPREE_ID is set,
//     otherwise they run in demo mode (success screen only, nothing is sent).
// Backend mode (VITE_USE_BACKEND=true): everything goes through the Node API in /server.

export type MenuItem = {
  id: string
  category: string
  name: string
  description: string
  price: number
  badge?: string | null
  image?: string | null // path under /public, e.g. images/menu/ube-latte.jpg
  available: boolean
}

export type Customer = {
  id: string
  name: string
  role: string
  memberSince: string // "YYYY-MM"
  visitsPerWeek: number
  favoriteItem: string // a MenuItem id
  rating: number // 1-5
  quote: string
}

export const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === "true"
const FORMSPREE_ID = (import.meta.env.VITE_FORMSPREE_ID as string | undefined)?.trim()
// BASE_URL keeps fetches working when the site is hosted under a sub-path (e.g. GitHub Pages /repo/)
const BASE = import.meta.env.BASE_URL

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json()
}

// ---------- GET: Dataset 1 (products) and Dataset 2 (customers) ----------
export async function getProducts(signal?: AbortSignal): Promise<MenuItem[]> {
  if (USE_BACKEND) {
    const data = await getJson<{ items: MenuItem[] }>("/api/menu", signal)
    return data.items
  }
  return getJson<MenuItem[]>(`${BASE}products.json`, signal)
}

export const getCustomers = (signal?: AbortSignal) =>
  getJson<Customer[]>(`${BASE}customers.json`, signal)

/** Photo URL for a product. Falls back to images/menu/<id>.jpg (also used when the API omits `image`). */
export const productImage = (item: MenuItem) =>
  `${BASE}${item.image || `images/menu/${item.id}.jpg`}`

// ---------- POST helpers ----------
async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error("Can't reach the server. Please check your connection.")
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const details = data.details ? Object.values(data.details).join(" ") : ""
    const formspree = Array.isArray(data.errors)
      ? data.errors.map((e: { message: string }) => e.message).join(" ")
      : ""
    throw new Error(details || formspree || data.error || "Something went wrong.")
  }
  return data
}

const toFormspree = (payload: Record<string, unknown>) =>
  postJson(`https://formspree.io/f/${FORMSPREE_ID}`, payload, { Accept: "application/json" })

let warned = false
function demoNotice() {
  if (!warned) {
    warned = true
    console.warn(
      "[Kanlungan] Demo mode: nothing was sent. Set VITE_FORMSPREE_ID (or VITE_USE_BACKEND=true) to deliver forms.",
    )
  }
}

// ---------- Contact form ----------
export type MessageInput = { name: string; email: string; topic: string; message: string }

export async function sendMessage(input: MessageInput) {
  if (USE_BACKEND) return postJson("/api/messages", input)
  if (FORMSPREE_ID) {
    return toFormspree({ ...input, _subject: `Kanlungan inquiry: ${input.topic || "General"}` })
  }
  demoNotice()
}

// ---------- Pickup orders ----------
export type OrderInput = {
  items: Record<string, number>
  studentDiscount: boolean
  pickupName: string
  mobile: string
  note: string
  // Human-readable copy for the email in static mode (the backend recomputes its own totals)
  summary: string
  total: number
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const makeCode = () =>
  "KC-" +
  Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("")

/** Returns the order code to show the customer. */
export async function sendOrder(input: OrderInput): Promise<string> {
  if (USE_BACKEND) {
    const { summary: _s, total: _t, ...payload } = input
    const data = await postJson("/api/orders", payload)
    return data.order.code
  }
  const code = makeCode()
  if (FORMSPREE_ID) {
    await toFormspree({
      _subject: `New pickup order ${code}`,
      orderCode: code,
      pickupName: input.pickupName,
      mobile: input.mobile,
      note: input.note,
      studentDiscount: input.studentDiscount ? "Yes (check school ID)" : "No",
      order: input.summary,
      total: `₱${input.total}`,
    })
  } else {
    demoNotice()
  }
  return code
}
