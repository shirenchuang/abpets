import http from 'node:http'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { apiGet, apiPost, c, clearSession, readSession, saveSession, SESSION_FILE, WEB_BASE } from './common.mjs'

function openBrowser(url) {
  const platform = process.platform
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.unref()
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1024 * 1024) {
        reject(new Error('request too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')) } catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

async function startLoginServer(state) {
  let complete
  let fail
  const done = new Promise((resolve, reject) => {
    complete = resolve
    fail = reject
  })
  let finished = false
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', WEB_BASE)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    if (req.method !== 'POST' || req.url !== '/callback') {
      res.writeHead(404)
      res.end('not found')
      return
    }
    try {
      const body = await readJson(req)
      if (body.state !== state) throw new Error('state mismatch')
      if (!body.token || !body.user?.handle) throw new Error('missing token')
      finished = true
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      complete({ token: body.token, user: body.user, createdAt: new Date().toISOString() })
      server.close()
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err?.message || String(err) }))
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const timer = setTimeout(() => {
    if (!finished) {
      server.close()
      fail(new Error('login timed out'))
    }
  }, 120000)
  done.then(() => clearTimeout(timer), () => clearTimeout(timer))
  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('could not bind local login server')
  }
  return { port: address.port, done }
}

export async function runLogin() {
  const state = randomBytes(24).toString('base64url')
  const { port, done } = await startLoginServer(state)
  const url = `${WEB_BASE}/cli-login?port=${port}&state=${state}`
  console.log(`${c.dim('→')} opening ${c.cyan(url)}`)
  openBrowser(url)
  console.log(`${c.dim('→')} waiting for browser login...`)
  const session = await done
  saveSession(session)
  console.log(`${c.green('✓')} logged in as ${c.bold('@' + session.user.handle)}`)
  console.log(`${c.dim('session:')} ${SESSION_FILE}`)
  return 0
}

export async function runWhoami() {
  const local = readSession()
  if (!local) {
    console.log(`not logged in — run ${c.green('abpets login')}`)
    return 1
  }
  const me = await apiGet('/api/me')
  console.log(`${c.green('✓')} logged in as ${c.bold('@' + me.handle)}`)
  return 0
}

export async function runLogout() {
  const local = readSession()
  if (local) {
    await apiPost('/api/auth/logout', {}).catch(() => {})
  }
  clearSession()
  console.log(`${c.green('✓')} logged out`)
  return 0
}
