#!/usr/bin/env node
// abpets — companion CLI for the AgentBro pet community.
//
// Usage:
//   abpets install <slug>
//   abpets list
//   abpets uninstall <slug>
//   abpets search [query]
//   abpets login
//   abpets submit <path>
//
// API base resolution: $ABPETS_API > built-in production URL.

import { spawnSync } from 'node:child_process'
import { runInstall } from '../src/install.mjs'
import { runList } from '../src/list.mjs'
import { runUninstall } from '../src/uninstall.mjs'
import { runSearch } from '../src/search.mjs'
import { runLogin, runLogout, runWhoami } from '../src/auth.mjs'
import { runSubmit } from '../src/submit.mjs'
import { printUsage } from '../src/usage.mjs'

const [, , cmd, ...rest] = process.argv
const NETWORK_COMMANDS = new Set(['install', 'search', 'login', 'logout', 'whoami', 'submit'])

function hasProxyEnv() {
  return Boolean(
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy
  )
}

if (
  NETWORK_COMMANDS.has(cmd) &&
  hasProxyEnv() &&
  !process.env.NODE_USE_ENV_PROXY &&
  !process.env.ABPETS_PROXY_BOOTSTRAPPED &&
  process.allowedNodeEnvironmentFlags?.has('--use-env-proxy')
) {
  const child = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_USE_ENV_PROXY: '1',
      ABPETS_PROXY_BOOTSTRAPPED: '1',
    },
  })
  if (child.error) throw child.error
  if (child.signal) process.kill(process.pid, child.signal)
  process.exit(child.status ?? 1)
}

const dispatch = {
  install: runInstall,
  list: runList,
  uninstall: runUninstall,
  remove: runUninstall, // alias
  search: runSearch,
  login: runLogin,
  logout: runLogout,
  whoami: runWhoami,
  submit: runSubmit,
  help: () => { printUsage(); return 0 },
  '--help': () => { printUsage(); return 0 },
  '-h': () => { printUsage(); return 0 },
}

const handler = dispatch[cmd]
if (!handler) {
  if (cmd) console.error(`abpets: unknown command "${cmd}"\n`)
  printUsage()
  process.exit(cmd ? 1 : 0)
}

try {
  const code = await handler(rest)
  process.exit(Number.isInteger(code) ? code : 0)
} catch (err) {
  console.error(`abpets: ${err?.message || err}`)
  process.exit(1)
}
