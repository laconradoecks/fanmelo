// Waitlist API client.
// Set VITE_WAITLIST_ENDPOINT (e.g. in .env.local) to your Google Apps Script web app URL.
// GET  -> { ok: true, total: number, creators: number }
// POST -> { ok: true } | { ok: false, error: 'duplicate' | 'invalid' | string }

export type Role = 'creator' | 'fan'
export type Entry = { email: string; role: Role; handle: string; country: string }
export type Count = { value: string; label: string }
export type JoinResult = 'ok' | 'duplicate' | 'invalid' | 'closed' | 'network' | 'error'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

const ENDPOINT: string = import.meta.env.VITE_WAITLIST_ENDPOINT ?? ''
const enabled = /^https:\/\//.test(ENDPOINT)

const fmt = (n: number) => n.toLocaleString('en-US')

export async function fetchCount(): Promise<Count | null> {
  if (!enabled) return null
  try {
    const d = await (await fetch(ENDPOINT)).json()
    if (!d?.ok) return null
    if (d.creators > 50) return { value: fmt(d.creators), label: 'creators waiting' }
    if (d.total > 50) return { value: fmt(d.total), label: 'people waiting' }
  } catch {
    /* count is optional */
  }
  return null
}

export async function join(entry: Entry): Promise<JoinResult> {
  if (!enabled) return 'closed'
  try {
    const r = await fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(entry) })
    const d = await r.json()
    if (d.ok) return 'ok'
    if (d.error === 'duplicate' || d.error === 'invalid') return d.error
    return 'error'
  } catch {
    return 'network'
  }
}

export function cleanHandle(raw: string) {
  const h = raw.trim().replace(/[^@A-Za-z0-9._]/g, '').slice(0, 40)
  return h && h[0] !== '@' ? '@' + h : h
}

export const COUNTRIES = [
  'Uganda', 'United States', 'Kenya', 'Nigeria', 'Rwanda', 'Tanzania', 'South Africa', 'Ghana',
  'United Kingdom', 'Canada', 'Germany', 'France', 'Netherlands', 'Ireland',
  'India', 'Philippines', 'Brazil', 'Australia', 'United Arab Emirates', 'Other',
]

const TZ: Record<string, string> = {
  'Africa/Kampala': 'Uganda', 'Africa/Nairobi': 'Kenya', 'Africa/Lagos': 'Nigeria', 'Africa/Kigali': 'Rwanda',
  'Africa/Dar_es_Salaam': 'Tanzania', 'Africa/Johannesburg': 'South Africa', 'Africa/Accra': 'Ghana',
  'Europe/London': 'United Kingdom', 'Europe/Berlin': 'Germany', 'Europe/Paris': 'France',
  'Europe/Amsterdam': 'Netherlands', 'Europe/Dublin': 'Ireland', 'Asia/Kolkata': 'India', 'Asia/Calcutta': 'India',
  'Asia/Manila': 'Philippines', 'America/Sao_Paulo': 'Brazil', 'Australia/Sydney': 'Australia',
  'Australia/Melbourne': 'Australia', 'Asia/Dubai': 'United Arab Emirates', 'America/Toronto': 'Canada',
  'America/Vancouver': 'Canada',
}

/** Best guess at the visitor's country from their time zone. */
export function guessCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    return TZ[tz] || (tz.startsWith('America/') ? 'United States' : '')
  } catch {
    return ''
  }
}
