---
name: figma-batch-icons
description: 当用户要把 Figma 里的成组 icon 批量导出为 SVG、统一命名为高亮态和置灰态文件，并在后续根据 COS 基础路径生成映射表时使用。适用于给出 Figma 链接、容器节点、业务清单、导出目录、COS 路径等场景。
---

# Figma Batch Icons

## Overview

这个 skill 用来把 Figma 里一整组 icon 的重复导出工作流程化，重点解决两件事：

- 把一组 icon 统一导出成 `xxx.svg` 和 `xxx_disabled.svg`
- 在用户手动上传 COS 后，根据基础路径生成映射表

这个 skill 不负责上传 COS。用户会自己上传目录，然后再提供 COS 基础路径。

## 适用场景

出现下面这些需求时使用这个 skill：

- “把这个 Figma 节点下的 40 多个 icon 全部导出成 svg”
- “高亮态和不可点击态要按统一命名导出”
- “我上传完 COS 后，给我返回映射表”
- “我已经有本地 svg 目录，只差拼出文件名和链接映射”

如果用户只是要实现 Figma 设计稿页面，不要用这个 skill，优先用现有的 `$figma`。

## 工作流

### 1. 从 Figma 收集导出信息

优先使用 Figma MCP 工具拿容器节点的结构和资源：

- 先对容器节点调用 `get_metadata`
- 再对容器节点调用 `get_design_context`
- 如果 `get_design_context` 已经返回整批 icon 的资源地址，直接整理成 manifest
- 如果某些 icon 没有直接返回资源地址，按具体节点补调用 `get_design_context`
- 如果仍拿不到可直接下载的资源，最后才对单个节点使用 `use_figma` + `exportAsync({ format: 'SVG' })`

导出时遵守以下命名规则：

- 高亮态：`{key}.svg`
- 置灰态：`{key}_disabled.svg`

如果多条业务记录复用同一组图标，不要额外复制文件，在 manifest 里显式复用同一个文件名即可。

### 2. 准备 manifest

manifest 是这套流程的唯一事实来源。格式示例见 [references/manifest.example.json](references/manifest.example.json)。

最少需要这些字段：

- `order`
- `name`
- `key`
- `activeFile`
- `inactiveFile`

导出阶段额外使用下面任一组字段：

- `activeUrl` / `inactiveUrl`
- `activeBase64` / `inactiveBase64`

如果用户后面只想生成映射表，manifest 可以不带 URL 或 Base64。

### 3. 批量落地本地 SVG

准备好 manifest 后，运行：

```bash
node ./.codex/skills/figma-batch-icons/scripts/download_icons.mjs \
  --manifest /绝对路径/manifest.json \
  --out-dir /绝对路径/输出目录
```

这个脚本会：

- 按 manifest 写出 SVG 文件
- 同时支持 URL 下载和 Base64 落地
- 自动把 `var(--fill-0, ...)`、`var(--stroke-0, ...)` 这种写法正规化
- 输出 `export-summary.json`

### 4. 用户手动上传 COS

这一步由用户自己完成。不要在这个 skill 里上传 COS。

### 5. 生成映射表

用户给出 COS 基础路径后，运行：

```bash
node ./.codex/skills/figma-batch-icons/scripts/build_mapping.mjs \
  --manifest /绝对路径/manifest.json \
  --base-url https://example.com/images/record/icons/level \
  --out-dir /绝对路径/输出目录
```

这个脚本会生成：

- `icon_table.csv`
- `icon_table.md`
- `icon_table.json`

默认字段为：

- `序号`
- `记录名称`
- `后端标识`
- `文件名`
- `置灰文件名`
- `链接`
- `备注`

## 处理规则

### 节点命名和业务名不一致

Figma 节点名经常和业务名不同，比如 `Nurse` 实际要对外映射成 `awake`。这种情况：

- 不要改 Figma 节点名来迁就业务
- 在 manifest 里直接写业务 `key`
- 如有必要，在 `note` 里说明原节点名

### 复用图标

如果两条记录复用同一组文件，例如：

- `mother_weight -> weight.svg`
- `mother_body_heat -> body_heat.svg`

直接在 manifest 里把它们指向同一文件名，不要复制文件。

### 缺项处理

如果 manifest 中有业务项，但当前 Figma 节点下没有找到对应资源：

- 先在结果里明确标记缺失
- 不要擅自生成占位图
- 让用户确认该项是否复用已有图标，或提供补充节点

## 脚本

### `scripts/download_icons.mjs`

把 manifest 里的 URL 或 Base64 批量写成本地 SVG。

### `scripts/build_mapping.mjs`

根据 manifest 和 COS 基础路径生成映射表。

## 输出要求

对用户汇报时优先给这些结果：

- 导出目录
- 成功导出的 SVG 数量
- 是否存在复用项
- 映射表路径
- 缺失项或人工确认项

不要默认输出冗长的逐文件过程日志，除非用户要求。
