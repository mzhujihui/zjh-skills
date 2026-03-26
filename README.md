# zjh-skills

一个面向 AI Agent 终端（Claude Code 等）的个人 skill 合集，用于自动化日常开发提效工作流。

<p align="center">
  <img src="https://img.shields.io/badge/Skills-1-blue" alt="1 Skill" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License" />
</p>

## Skills

| Skill | 简介 | 安装命令 |
|-------|------|---------|
| [**figma-batch-icons**](./skills/figma-batch-icons/) | 将 Figma 容器节点下的一组 Icon 批量导出为 SVG（高亮态 / 置灰态），并在上传 COS 后自动生成映射表 | `npx skills add mzhujihui/zjh-skills --path skills/figma-batch-icons` |

## Quick Start

使用以下命令安装任意 skill：

```bash
npx skills add mzhujihui/zjh-skills --path skills/<skill-name>
```

安装完成后，在 Agent 终端中调用：

```bash
/figma-batch-icons    # 批量导出 Figma icon 并生成映射表
```

## License

MIT
