# Logseq Todos in Obsidian

在 Obsidian 侧边栏中显示 Logseq 格式的待办事项，支持完整的状态管理和增强渲染。

## 功能特性

### 1. 侧边栏待办事项视图

- 在 Obsidian 侧边栏显示所有 Logseq 格式的待办事项
- 支持点击跳转到原文件位置
- 支持展开/折叠子任务

### 2. 多状态支持

| 状态 | 图标 | 说明 |
|------|------|------|
| NOW | 🔨 | 正在进行 |
| DOING | 🔄 | 处理中 |
| LATER | 📅 | 稍后处理 |
| TODO | 📋 | 待办 |
| DONE | ✅ | 已完成 |
| CANCELLED | ❌ | 已取消 |

### 3. 路径配置

- **Logseq 路径**：指定哪些目录使用 Logseq 格式渲染（支持多路径）
- **日志目录**：配置 journals 目录路径
- **页面目录**：配置 pages 目录路径

### 4. 状态筛选

- 可独立启用/禁用每种状态的显示
- 默认显示所有状态

### 5. 显示设置

- **排序方式**：按状态、日期或标题排序
- **显示计划时间**：显示任务的 scheduled 时间
- **显示优先级**：显示任务优先级标记
- **侧边栏位置**：左侧或右侧

### 6. 自动刷新

- 可配置自动刷新间隔（秒）
- 设置为 0 可禁用自动刷新
- 支持手动刷新按钮

### 7. Logseq 格式增强渲染

- 在日志文件中按照 Logseq 格式进行增强渲染
- 支持块引用、标签、优先级等语法

## 安装

### 手动安装

1. 下载 `main.js`、`styles.css`、`manifest.json` 文件
2. 在 Obsidian 库中创建文件夹：`你的库/.obsidian/plugins/logseq-todos-in-obsidian/`
3. 将下载的文件放入该文件夹
4. 重启 Obsidian，在设置中启用插件

### 从源码构建

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build
```

## 使用方法

### 打开待办事项面板

1. 点击左侧或右侧边栏的待办事项图标
2. 或使用命令面板搜索 "Logseq Todos: Show Todos"

### 待办事项语法

支持 Logseq 标准语法：

```
- TODO 普通待办
- DOING 正在进行
- NOW 当前任务
- LATER 稍后处理
- DONE 已完成
- CANCELLED 已取消
```

### 优先级

```
- TODO [#A] 高优先级
- TODO [#B] 中优先级
- TODO [#C] 低优先级
```

### 计划与截止日期

```
- TODO 任务内容
  SCHEDULED: <2024-01-15 Mon>
  DEADLINE: <2024-01-20 Sat>
```

### 标签

```
- TODO 任务内容 #标签1 #标签2
```

### 子任务

```
- TODO 父任务
  - TODO 子任务1
  - DOING 子任务2
```

## 配置选项

在 Obsidian 设置中找到 "Logseq Todos" 进行配置：

| 选项 | 说明 | 默认值 |
|------|------|--------|
| Logseq Paths | Logseq 格式渲染的目录 | `工作日志` |
| Journals Path | 日志目录路径 | `journals` |
| Pages Path | 页面目录路径 | `pages` |
| Enabled Statuses | 启用的状态 | 全部启用 |
| Sort By | 排序方式 | `status` |
| Show Scheduled | 显示计划时间 | `true` |
| Show Priority | 显示优先级 | `true` |
| Sidebar Position | 侧边栏位置 | `right` |
| Auto Refresh Interval | 自动刷新间隔（秒） | `30` |

## 自定义样式

可通过 CSS 变量自定义状态颜色：

```css
.theme-dark {
    --logseq-now-color: #3b82f6;
    --logseq-doing-color: #eab308;
    --logseq-later-color: #f97316;
    --logseq-todo-color: #6b7280;
    --logseq-done-color: #22c55e;
    --logseq-cancelled-color: #ef4444;
}
```

## 技术栈

- TypeScript
- Obsidian API
- ESBuild

## 许可证

MIT