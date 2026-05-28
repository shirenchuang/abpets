import fs from 'node:fs'
import path from 'node:path'
import { c, parsePetRef, TARGET_DIRS } from './common.mjs'

const ROOT_LABELS = ['codex', 'agentbro']

// Local pets are keyed by slug only (no handle in the path). Accept both
// `abpets uninstall luffy` and `abpets uninstall alice/luffy`; the handle is
// accepted but otherwise ignored — we wouldn't know which one to keep anyway,
// since on disk there's only ever one entry per slug.
export function runUninstall([ref]) {
  if (!ref) { console.error('abpets uninstall: missing <handle/slug> or <slug>'); return 1 }
  const { slug } = parsePetRef(ref)

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
