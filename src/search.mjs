import { apiGet, c } from './common.mjs'

function matches(pet, q) {
  if (!q) return true
  const haystack = [
    pet.displayName, pet.slug, pet.description,
    pet.authorHandle, ...(pet.tags || []),
  ].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(q.toLowerCase())
}

export async function runSearch([query = '']) {
  const data = await apiGet('/api/manifest')
  const pets = Array.isArray(data?.pets) ? data.pets : []
  const hits = pets.filter((p) => matches(p, query))

  if (hits.length === 0) {
    if (query) console.log(`${c.dim('no pets matched')} "${query}"`)
    else console.log(c.dim('(community is empty)'))
    return 0
  }

  console.log()
  const heading = query ? `${hits.length} of ${pets.length} pets match "${query}"` : `${hits.length} pets in the community`
  console.log(`  ${c.bold(heading)}`)
  console.log()

  // Sort: most-downloaded first, then newest.
  hits.sort((a, b) => {
    const d = (b.downloadCount ?? 0) - (a.downloadCount ?? 0)
    if (d !== 0) return d
    return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
  })

  for (const p of hits) {
    const tags = (p.tags || []).slice(0, 3).map((t) => c.cyan(t)).join(' ')
    const dl = p.downloadCount ? c.dim(`  ${p.downloadCount}↓`) : ''
    const fullSlug = p.fullSlug ?? `${p.authorHandle}/${p.slug}`
    console.log(`  ${c.bold(p.displayName)}  ${c.dim(fullSlug)}${dl}`)
    if (p.description) console.log(`    ${c.dim(p.description.length > 88 ? p.description.slice(0, 88) + '…' : p.description)}`)
    const meta = [`by @${p.authorHandle}`, tags].filter(Boolean).join('  ')
    if (meta) console.log(`    ${c.dim(meta)}`)
    console.log(`    ${c.green('abpets install ' + fullSlug)}`)
    console.log()
  }
  return 0
}
