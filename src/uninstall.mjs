import fs from 'node:fs'
import path from 'node:path'
import { c, ensureSlug, TARGET_DIRS } from './common.mjs'

const ROOT_LABELS = ['codex', 'agentbro']

export function runUninstall([slug]) {
  if (!slug) { console.error('abpets uninstall: missing <slug>'); return 1 }
  ensureSlug(slug)

  let removed = 0
  TARGET_DIRS.forEach((root, idx) => {
    const dir = path.join(root, slug)
    if (!fs.existsSync(dir)) return
    fs.rmSync(dir, { recursive: true, force: true })
    console.log(`${c.green('✓')} removed  ${c.dim(ROOT_LABELS[idx] + ':')} ${dir}`)
    removed++
  })

  if (removed === 0) {
    console.log(`${c.yellow('!')} ${slug} is not installed in either ~/.codex/pets or ~/.agentbro/pets`)
    return 1
  }
  return 0
}
