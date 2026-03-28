# Logseq Todos in Obsidian - Agent Guide

## 项目概述

这是一个 Obsidian 插件，用于在 Obsidian 的侧边栏中显示 Logseq 的待办事项（Todos）。

### 主要功能
- 在 Obsidian 侧边栏中显示 Logseq 格式的待办事项
- 支持多种状态：NOW、DOING、LATER、TODO、DONE、CANCELLED
- 支持自动刷新功能
- 支持自定义样式设置
- **Logseq 格式增强渲染**：支持在日志文件中按照 Logseq 格式进行增强渲染

## 技术栈

- **TypeScript**: 主要开发语言
- **Obsidian API**: 插件开发框架
- **ESBuild**: 构建工具

## 项目结构

```
.
├── src/
│   ├── main.ts           # 插件主入口
│   ├── TodoView.ts       # 待办事项视图组件
│   ├── TodoItem.ts       # 待办事项数据模型和设置
│   ├── LogseqParser.ts   # Logseq 格式解析器
│   ├── LogseqRenderer.ts # 渲染器
│   └── SettingsTab.ts    # 设置面板
├── styles/
│   └── styles.css        # 样式文件
├── manifest.json         # 插件清单
├── package.json          # 项目配置
└── tsconfig.json         # TypeScript 配置
```

## 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 清理构建文件
npm run clean
```

## 代码规范

- 使用 TypeScript 严格模式
- 遵循 Obsidian 插件开发规范
- 使用 4 空格缩进
- 类名使用 PascalCase
- 函数和变量使用 camelCase

## 注意事项

- 插件依赖 Obsidian API，请确保使用兼容的版本
- 样式文件需要同步更新到根目录和 styles/ 目录
- 构建后需要重启 Obsidian 以加载更新
