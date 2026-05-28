#!/usr/bin/env node
// abpets — companion CLI for the AgentBro pet community.
//
// Usage:
//   abpets install <slug>
//   abpets list
//   abpets uninstall <slug>
//   abpets search [query]
//
// API base resolution: $ABPETS_API > built-in production URL.

import { runInstall } from '../src/install.mjs'
import { runList } from '../src/list.mjs'
import { runUninstall } from '../src/uninstall.mjs'
import { runSearch } from '../src/search.mjs'
import { printUsage } from '../src/usage.mjs'

const [, , cmd, ...rest] = process.argv

const dispatch = {
  install: runInstall,
  list: runList,
  uninstall: runUninstall,
  remove: runUninstall, // alias
  search: runSearch,
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
