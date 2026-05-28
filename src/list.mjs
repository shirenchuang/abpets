import fs from 'node:fs'
import path from 'node:path'
import { c, TARGET_DIRS } from './common.mjs'

function readPetMeta(petDir) {
  const petJsonPath = path.join(petDir, 'pet.json')
  if (!fs.existsSync(petJsonPath)) return null
  try {
    return JSON.parse(fs.readFileSync(petJsonPath, 'utf8'))
  } catch {
    return null
  }
}

// Walk each target dir, collect installed slugs, and pivot into:
//   { slug: { displayName, installedIn: Set<dirIndex>, broken: boolean } }
function scan() {
  const map = new Map()
  TARGET_DIRS.forEach((root, idx) => {
    if (!fs.existsSync(root)) return
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const slug = entry.name
      const meta = readPetMeta(path.join(root, slug))
      if (!map.has(slug)) {
        map.set(slug, { slug, displayName: meta?.displayName ?? slug, installedIn: new Set(), broken: meta === null })
      }
      map.get(slug).installedIn.add(idx)
    }
  })
  return [...map.values()]
}

const ROOT_LABELS = ['codex', 'agentbro']

export function runList() {
  const items = scan()
  if (items.length === 0) {
    console.log(`${c.dim('(no pets installed)')}\n`)
    console.log(`Browse the community:  ${c.cyan('https://www.agentbro.net/pets')}`)
    return 0
  }
  console.log()
  console.log(`  ${c.bold(items.length)} installed pet${items.length === 1 ? '' : 's'}`)
  console.log()
  for (const it of items.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const tags = [...it.installedIn].map((i) => ROOT_LABELS[i]).join(', ')
    const broken = it.broken ? c.yellow('  ⚠ missing pet.json') : ''
    console.log(`  ${c.bold(it.displayName)}  ${c.dim('/' + it.slug)}  ${c.dim('[' + tags + ']')}${broken}`)
  }
  console.log()
  console.log(`  ${c.dim('roots:')}`)
  TARGET_DIRS.forEach((p, i) => console.log(`    ${c.dim(ROOT_LABELS[i] + ':')} ${p}`))
  console.log()
  return 0
}
