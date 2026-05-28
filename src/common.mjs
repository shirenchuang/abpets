// Shared utilities: API base, paths, ANSI styling.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const DEFAULT_API = 'https://agentbro-pets-api-production.agentbro.workers.dev'
export const API_BASE = (process.env.ABPETS_API || DEFAULT_API).replace(/\/$/, '')
export const DEFAULT_WEB = 'https://www.agentbro.net'
export const WEB_BASE = (process.env.ABPETS_WEB || DEFAULT_WEB).replace(/\/$/, '')

// Both target dirs. Codex Desktop reads ~/.codex/pets/, AgentBro reads
// ~/.agentbro/pets/. We always write to both so a single `install` makes the
// pet visible in either tool. Users who only use one app pay a tiny disk
// overhead but get the simpler mental model.
const HOME = os.homedir()
const CONFIG_DIR = path.join(HOME, '.abpets')
export const SESSION_FILE = path.join(CONFIG_DIR, 'session.json')
export const TARGET_DIRS = [
  path.join(HOME, '.codex', 'pets'),
  path.join(HOME, '.agentbro', 'pets'),
]

// ANSI helpers. We avoid a `chalk` dependency to keep `npx abpets` cold-start
// fast and the install footprint zero.
const tty = process.stdout.isTTY
const wrap = (open, close) => (s) => tty ? `\x1b[${open}m${s}\x1b[${close}m` : String(s)
export const c = {
  bold:   wrap(1, 22),
  dim:    wrap(2, 22),
  red:    wrap(31, 39),
  green:  wrap(32, 39),
  yellow: wrap(33, 39),
  cyan:   wrap(36, 39),
  gray:   wrap(90, 39),
}

function sessionHeaders() {
  const session = readSession()
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {}
}

async function parseError(res, url) {
  let body = ''
  try { body = await res.text() } catch {}
  let detail = body
  try {
    const json = body ? JSON.parse(body) : null
    detail = json?.detail || json?.error || body
  } catch {}
  const err = new Error(`${url} → ${res.status} ${res.statusText}${detail ? ` — ${String(detail).slice(0, 200)}` : ''}`)
  err.status = res.status
  err.body = body
  throw err
}

export async function apiGet(pathname) {
  const url = `${API_BASE}${pathname}`
  const res = await fetch(url, { headers: sessionHeaders() })
  if (!res.ok) {
    await parseError(res, url)
  }
  return res.json()
}

export async function apiPost(pathname, body) {
  const url = `${API_BASE}${pathname}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    await parseError(res, url)
  }
  return res.json().catch(() => ({}))
}

export function readSession() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
    if (!session?.token || !session?.user?.handle) return null
    return session
  } catch {
    return null
  }
}

export function saveSession(session) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), { mode: 0o600 })
}

export function clearSession() {
  fs.rmSync(SESSION_FILE, { force: true })
}

export function requireSession() {
  const session = readSession()
  if (!session) throw new Error(`not logged in — run ${c.green('abpets login')}`)
  return session
}

export function ensureSlug(slug) {
  if (!slug || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
    throw new Error(`invalid slug "${slug}" — expected lowercase letters / numbers / dashes, 2–41 chars`)
  }
}

// Parse "alice/luffy" → { handle, slug } or "luffy" → { handle: null, slug }.
// Throws if the format is structurally invalid (e.g. multiple slashes, empty
// segment). The handle character class matches GitHub login rules.
export function parsePetRef(ref) {
  if (typeof ref !== 'string' || !ref) {
    throw new Error('missing pet reference')
  }
  const parts = ref.split('/')
  if (parts.length === 1) {
    ensureSlug(parts[0])
    return { handle: null, slug: parts[0] }
  }
  if (parts.length === 2) {
    const [handle, slug] = parts
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(handle)) {
      throw new Error(`invalid handle "${handle}"`)
    }
    ensureSlug(slug)
    return { handle, slug }
  }
  throw new Error(`invalid pet reference "${ref}" — expected <handle>/<slug> or <slug>`)
}
