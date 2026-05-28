import fs from 'node:fs'
import path from 'node:path'
import { apiPost, c, ensureSlug, requireSession, WEB_BASE } from './common.mjs'

const MAX_SHEET_BYTES = 5 * 1024 * 1024
const MAX_JSON_BYTES = 4 * 1024
const REQUIRED_WIDTH = 1536
const REQUIRED_HEIGHT = 1872
const KINDS = new Set(['creature', 'character', 'object', 'other'])

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 41)
}

function fileExists(file) {
  try { return fs.statSync(file).isFile() } catch { return false }
}

function readJson(file) {
  if (fs.statSync(file).size > MAX_JSON_BYTES) {
    throw new Error(`${file} is too large; pet.json must be <= 4 KB`)
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!json || typeof json !== 'object') throw new Error('pet.json must be an object')
  for (const key of ['id', 'displayName', 'spritesheetPath']) {
    if (typeof json[key] !== 'string' || !json[key]) {
      throw new Error(`pet.json missing ${key}`)
    }
  }
  return json
}

function detectFormat(file) {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.png') return { format: 'png', contentType: 'image/png' }
  if (ext === '.webp') return { format: 'webp', contentType: 'image/webp' }
  throw new Error('spritesheet must be .webp or .png')
}

function readPngDimensions(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function readWebpDimensions(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  const kind = buf.toString('ascii', 12, 16)
  if (kind === 'VP8X' && buf.length >= 30) {
    return {
      width: 1 + buf.readUIntLE(24, 3),
      height: 1 + buf.readUIntLE(27, 3),
    }
  }
  if (kind === 'VP8 ' && buf.length >= 30) {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    }
  }
  if (kind === 'VP8L' && buf.length >= 25) {
    const bits = buf.readUInt32LE(21)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }
  return null
}

function assertSpritesheet(file, format) {
  const stat = fs.statSync(file)
  if (stat.size > MAX_SHEET_BYTES) throw new Error(`${file} is too large; spritesheet must be <= 5 MB`)
  const buf = fs.readFileSync(file)
  const dims = format === 'png' ? readPngDimensions(buf) : readWebpDimensions(buf)
  if (!dims) throw new Error(`could not read dimensions for ${file}`)
  if (dims.width !== REQUIRED_WIDTH || dims.height !== REQUIRED_HEIGHT) {
    throw new Error(`spritesheet must be ${REQUIRED_WIDTH}x${REQUIRED_HEIGHT}, got ${dims.width}x${dims.height}`)
  }
  return buf
}

function findSpritesheet(dir, petJson) {
  const fromJson = path.resolve(dir, petJson.spritesheetPath)
  if (fileExists(fromJson)) return fromJson
  for (const name of ['spritesheet.webp', 'spritesheet.png']) {
    const candidate = path.join(dir, name)
    if (fileExists(candidate)) return candidate
  }
  throw new Error(`no spritesheet found in ${dir}`)
}

function discoverPetDirs(input) {
  const resolved = path.resolve(input)
  const stat = fs.statSync(resolved)
  if (!stat.isDirectory()) throw new Error(`${input} is not a directory`)
  if (fileExists(path.join(resolved, 'pet.json'))) return [resolved]
  return fs.readdirSync(resolved, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fileExists(path.join(resolved, entry.name, 'pet.json')))
    .map((entry) => path.join(resolved, entry.name))
}

async function putFile(uploadUrl, data, contentType) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: data,
  })
  if (!res.ok) throw new Error(`asset upload failed: ${res.status} ${res.statusText}`)
}

async function submitOne(dir, options) {
  const petJsonPath = path.join(dir, 'pet.json')
  const petJson = readJson(petJsonPath)
  const slug = options.slug || slugify(petJson.id || path.basename(dir))
  ensureSlug(slug)

  const sheetPath = findSpritesheet(dir, petJson)
  const { format, contentType } = detectFormat(sheetPath)
  const sheetBytes = assertSpritesheet(sheetPath, format)
  const jsonBytes = fs.readFileSync(petJsonPath)
  const displayName = options.displayName || petJson.displayName
  const description = options.description ?? petJson.description ?? ''
  const kind = KINDS.has(options.kind) ? options.kind : 'other'
  const tags = options.tags

  console.log(`${c.dim('->')} submitting ${c.bold(displayName)} ${c.dim('from ' + dir)}`)

  const sheetName = `spritesheet.${format}`
  const sheetUpload = await apiPost('/api/upload-url', { filename: `${slug}/${sheetName}`, contentType })
  const jsonUpload = await apiPost('/api/upload-url', { filename: `${slug}/pet.json`, contentType: 'application/json' })

  await putFile(sheetUpload.uploadUrl, sheetBytes, contentType)
  await putFile(jsonUpload.uploadUrl, jsonBytes, 'application/json')

  const created = await apiPost('/api/pets', {
    slug,
    displayName,
    description,
    kind,
    tags,
    spritesheetUrl: sheetUpload.publicUrl,
    petJsonUrl: jsonUpload.publicUrl,
    width: REQUIRED_WIDTH,
    height: REQUIRED_HEIGHT,
    format,
  })

  console.log(`${c.green('✓')} submitted ${c.bold(created.fullSlug || slug)} ${c.dim('(pending review)')}`)
  console.log(`  ${c.dim('->')} ${WEB_BASE}/pets/${created.fullSlug || slug}`)
  return created
}

function parseOptions(args) {
  const options = { tags: [] }
  const rest = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--slug') options.slug = args[++i]
    else if (arg === '--name') options.displayName = args[++i]
    else if (arg === '--description') options.description = args[++i]
    else if (arg === '--kind') options.kind = args[++i]
    else if (arg === '--tag') options.tags.push(args[++i])
    else if (arg === '--tags') options.tags.push(...String(args[++i] || '').split(',').map((t) => t.trim()).filter(Boolean))
    else rest.push(arg)
  }
  return { target: rest[0], options }
}

export async function runSubmit(args) {
  const { target, options } = parseOptions(args)
  if (!target) { console.error('abpets submit: missing <path>'); return 1 }
  requireSession()
  const dirs = discoverPetDirs(target)
  if (dirs.length === 0) throw new Error(`no pet.json files found under ${target}`)
  if (dirs.length > 1 && options.slug) throw new Error('--slug can only be used when submitting one pet')

  const results = []
  for (const dir of dirs) {
    results.push(await submitOne(dir, options))
  }
  if (results.length > 1) {
    console.log(`${c.green('✓')} submitted ${results.length} pets for review`)
  }
  return 0
}
