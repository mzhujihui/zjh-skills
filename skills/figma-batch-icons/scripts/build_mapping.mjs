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

async function readManifest(manifestPath) {
  const content = await fs.readFile(manifestPath, 'utf8')
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.items))
    throw new Error('manifest 必须包含 items 数组')
  return data
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

function quoteCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function getFileNames(item) {
  return {
    activeFile: item.activeFile || `${item.key}.svg`,
    inactiveFile: item.inactiveFile || `${item.key}_disabled.svg`,
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const manifestPath = args.manifest
  const baseUrl = args['base-url']
  const outDir = args['out-dir']
  const checkFiles = args['check-files'] === 'true'

  if (!manifestPath || !baseUrl || !outDir)
    throw new Error('用法: build_mapping.mjs --manifest <path> --base-url <url> --out-dir <dir> [--check-files true]')

  const manifest = await readManifest(manifestPath)
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  const rows = []
  for (const item of manifest.items) {
    const { activeFile, inactiveFile } = getFileNames(item)
    const row = {
      order: item.order,
      name: item.name,
      key: item.key,
      activeFile,
      inactiveFile,
      url: `${normalizedBaseUrl}${activeFile}`,
      note: item.note || '',
    }

    if (checkFiles) {
      row.activeExists = await exists(path.join(outDir, activeFile))
      row.inactiveExists = await exists(path.join(outDir, inactiveFile))
    }

    rows.push(row)
  }

  const csvLines = [
    ['序号', '记录名称', '后端标识', '文件名', '置灰文件名', '链接', '备注']
      .map(quoteCsv)
      .join(','),
    ...rows.map(row => [
      row.order,
      row.name,
      row.key,
      row.activeFile,
      row.inactiveFile,
      row.url,
      row.note,
    ].map(quoteCsv).join(',')),
  ]

  const mdLines = [
    '| 序号 | 记录名称 | 后端标识 | 文件名 | 置灰文件名 | 链接 | 备注 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(row =>
      `| ${row.order} | ${row.name} | ${row.key} | ${row.activeFile} | ${row.inactiveFile} | ${row.url} | ${row.note} |`,
    ),
  ]

  const json = {
    manifestPath,
    baseUrl: normalizedBaseUrl,
    rows,
  }

  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'icon_table.csv'), `${csvLines.join('\n')}\n`, 'utf8')
  await fs.writeFile(path.join(outDir, 'icon_table.md'), `${mdLines.join('\n')}\n`, 'utf8')
  await fs.writeFile(path.join(outDir, 'icon_table.json'), `${JSON.stringify(json, null, 2)}\n`, 'utf8')

  console.log(`已生成 ${rows.length} 条映射记录`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
