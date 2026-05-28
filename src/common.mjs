// Shared utilities: API base, paths, ANSI styling.
import os from 'node:os'
import path from 'node:path'

export const DEFAULT_API = 'https://agentbro-pets-api-production.agentbro.workers.dev'
export const API_BASE = (process.env.ABPETS_API || DEFAULT_API).replace(/\/$/, '')

// Both target dirs. Codex Desktop reads ~/.codex/pets/, AgentBro reads
// ~/.agentbro/pets/. We always write to both so a single `install` makes the
// pet visible in either tool. Users who only use one app pay a tiny disk
// overhead but get the simpler mental model.
const HOME = os.homedir()
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

export async function apiGet(pathname) {
  const url = `${API_BASE}${pathname}`
  const res = await fetch(url)
  if (!res.ok) {
    let body = ''
    try { body = await res.text() } catch {}
    throw new Error(`${url} → ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`)
  }
  return res.json()
}

export async function apiPost(pathname, body) {
  const url = `${API_BASE}${pathname}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    // Best-effort: download-tracking failures should never block the user.
    throw new Error(`${url} → ${res.status} ${res.statusText}`)
  }
  return res.json().catch(() => ({}))
}

export function ensureSlug(slug) {
  if (!slug || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
    throw new Error(`invalid slug "${slug}" — expected lowercase letters / numbers / dashes, 2–41 chars`)
  }
}
