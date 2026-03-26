#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i]
    if (!current.startsWith('--'))
      continue
    const key = current.slice(2)
    const value = argv[i + 1]
    if (!value || value.startsWith('--'))
      throw new Error(`参数 ${current} 缺少值`)
    args[key] = value
    i += 1
  }
  return args
}

function normalizeSvg(text) {
  return text
    .replace(/var\(--fill-\d+,\s*([^)]+)\)/g, '$1')
    .replace(/var\(--stroke-\d+,\s*([^)]+)\)/g, '$1')
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function readManifest(manifestPath) {
  const content = await fs.readFile(manifestPath, 'utf8')
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.items))
    throw new Error('manifest 必须包含 items 数组')
  return data
}

function getFileNames(item) {
  const activeFile = item.activeFile || `${item.key}.svg`
  const inactiveFile = item.inactiveFile || `${item.key}_disabled.svg`
  return { activeFile, inactiveFile }
}

async function resolveSvgSource({ url, base64 }) {
  if (base64)
    return Buffer.from(base64, 'base64').toString('utf8')

  if (!url)
    return null

  const response = await fetch(url)
  if (!response.ok)
    throw new Error(`下载失败 ${response.status}: ${url}`)

  return await response.text()
}

async function writeSvg(filePath, content) {
  await fs.writeFile(filePath, normalizeSvg(content), 'utf8')
}

async function main() {
  const args = parseArgs(process.argv)
  const manifestPath = args.manifest
  const outDir = args['out-dir']

  if (!manifestPath || !outDir)
    throw new Error('用法: download_icons.mjs --manifest <path> --out-dir <dir>')

  const manifest = await readManifest(manifestPath)
  await ensureDir(outDir)

  const summary = {
    manifestPath,
    outDir,
    written: [],
    skipped: [],
  }

  for (const item of manifest.items) {
    const { activeFile, inactiveFile } = getFileNames(item)

    const activeSvg = await resolveSvgSource({
      url: item.activeUrl,
      base64: item.activeBase64,
    })

    const inactiveSvg = await resolveSvgSource({
      url: item.inactiveUrl,
      base64: item.inactiveBase64,
    })

    if (activeSvg) {
      const target = path.join(outDir, activeFile)
      await writeSvg(target, activeSvg)
      summary.written.push({
        key: item.key,
        state: 'active',
        file: activeFile,
      })
    } else {
      summary.skipped.push({
        key: item.key,
        state: 'active',
        reason: '缺少 activeUrl 或 activeBase64',
      })
    }

    if (inactiveSvg) {
      const target = path.join(outDir, inactiveFile)
      await writeSvg(target, inactiveSvg)
      summary.written.push({
        key: item.key,
        state: 'inactive',
        file: inactiveFile,
      })
    } else {
      summary.skipped.push({
        key: item.key,
        state: 'inactive',
        reason: '缺少 inactiveUrl 或 inactiveBase64',
      })
    }
  }

  await fs.writeFile(
    path.join(outDir, 'export-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  )

  console.log(`已写入 ${summary.written.length} 个 SVG 文件`)
  if (summary.skipped.length)
    console.log(`跳过 ${summary.skipped.length} 个文件，请查看 export-summary.json`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
