// The menu lives in public/products.json: the SAME file the website fetches.
// The server reads it to seed the database and NEVER trusts prices sent by the browser.
import { readFileSync } from 'node:fs'

export const STUDENT_DISCOUNT_RATE = 0.2 // 20% off Food items only
export const STUDENT_DISCOUNT_CATEGORY = 'Food'

export const MENU = JSON.parse(
  readFileSync(new URL('../public/products.json', import.meta.url), 'utf8'),
)
