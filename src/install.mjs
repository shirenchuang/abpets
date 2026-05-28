import fs from 'node:fs'
import path from 'node:path'
import { apiGet, apiPost, c, ensureSlug, TARGET_DIRS } from './common.mjs'
import { parseZip } from './zip.mjs'

// Reject any zip entry whose normalized path tries to escape the target dir.
// Pet zips are server-generated and well-formed, but we treat them as untrusted
// because they're arbitrary user uploads.
function safeJoin(targetDir, entryName) {
  const normalized = path.normalize(entryName).replace(/^[/\\]+/, '')
  const resolved = path.resolve(targetDir, normalized)
  if (resolved !== targetDir && !resolved.startsWith(targetDir + path.sep)) {
    throw new Error(`zip slip detected: ${entryName}`)
  }
  return resolved
}

export async function runInstall([slug]) {
  if (!slug) { console.error('abpets install: missing <slug>'); return 1 }
  ensureSlug(slug)

  // Fetch full pet record so we get the zipUrl + version, not just manifest.
  const pet = await apiGet(`/api/pets/${encodeURIComponent(slug)}`)
  if (!pet || pet.error) throw new Error(`pet "${slug}" not found`)
  if (pet.status !== 'approved') {
    throw new Error(`pet "${slug}" is ${pet.status}, not approved — can't install`)
  }
  if (!pet.zipUrl) {
    throw new Error(`pet "${slug}" has no .zip yet — ask the maintainer to rebuild it`)
  }

  console.log(`${c.dim('→')} fetching ${c.cyan(pet.zipUrl)}`)
  const res = await fetch(pet.zipUrl)
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`)
  const buf = Buffer.from(await res.arrayBuffer())
  console.log(`${c.dim('→')} downloaded ${c.bold((buf.length / 1024).toFixed(1) + ' KB')}`)

  const entries = parseZip(buf)
  if (entries.length === 0) throw new Error('zip is empty')

  // Pet zips wrap files in a top-level <slug>/ folder. We strip that prefix
  // when extracting so the files land directly under ~/.codex/pets/<slug>/.
  // If the zip happens to be flat (no folder), we just write each entry verbatim.
  const stripPrefix = entries.every((e) => e.name.startsWith(`${slug}/`)) ? `${slug}/` : ''

  let wroteEach = []
  for (const dir of TARGET_DIRS) {
    const petDir = path.join(dir, slug)
    fs.mkdirSync(petDir, { recursive: true })

    for (const entry of entries) {
      // Skip the folder entries themselves (zip "directories" end in /).
      if (entry.name.endsWith('/')) continue
      const rel = stripPrefix ? entry.name.slice(stripPrefix.length) : entry.name
      if (!rel) continue
      const dest = safeJoin(petDir, rel)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, entry.data)
    }
    wroteEach.push(petDir)
  }

  // Best-effort download counter ping; never fails the install.
  apiPost(`/api/pets/${encodeURIComponent(slug)}/download`, { source: 'cli' })
    .catch(() => {})

  console.log(`${c.green('✓')} installed ${c.bold(pet.displayName)} (${c.dim('/' + slug)})`)
  for (const p of wroteEach) console.log(`  ${c.dim('→')} ${p}`)
  return 0
}
