# AI 浏览器插件

基于 Plasmo 框架开发的浏览器扩展，提供智能执行、页面内容提取、版本管理等实用功能。

## 功能特性

### 核心功能

- **智能执行** - 选择预设配置，一键执行分析任务
- **页面内容提取** - 提取当前页面的文本、HTML、链接、图片等内容，支持导出为 TXT、Markdown、HTML 格式
- **版本检查** - 自动检测新版本，支持强制更新和可选更新
- **埋点上报** - 匿名使用数据统计，支持多种上报间隔配置

### 界面模块

| 模块 | 文件 | 说明 |
|------|------|------|
| **弹出窗口 (Popup)** | `src/popup.tsx` | 点击扩展图标打开的主界面，包含智能执行、常用工具、后台管理等 |
| **侧边栏 (Side Panel)** | `src/sidepanel.tsx` | 浏览器侧边栏界面，提供完整的内容提取和导出功能 |
| **设置页面 (Options)** | `src/options.tsx` | 扩展设置中心，包含通用设置、API配置、Popup布局、高级选项等 |
| **工作台 (Dashboard)** | `src/tabs/dashboard.tsx` | 独立标签页工作台 |
| **内容脚本 (Content)** | `src/content.ts` | 注入页面的脚本，负责页面内容提取 |

## 技术栈

- **框架**: [Plasmo](https://www.plasmo.com/) - 现代化的浏览器扩展开发框架
- **UI**: React 18 + TypeScript
- **构建**: pnpm + Plasmo CLI
- **权限**: tabs, storage, notifications, sidePanel, alarms

## 项目结构

```
browser-helper/
├── src/
│   ├── background.ts      # 后台服务脚本（版本检查、埋点上报）
│   ├── popup.tsx          # 弹出窗口界面
│   ├── sidepanel.tsx      # 侧边栏界面
│   ├── options.tsx        # 设置页面
│   ├── content.ts         # 内容脚本（页面内容提取）
│   ├── style.css          # 全局样式
│   ├── config/
│   │   └── index.ts       # 配置管理（API地址、默认值）
│   ├── lib/
│   │   └── analytics.ts   # 埋点工具
│   └── tabs/
│       └── dashboard.tsx  # 工作台页面
├── assets/
│   └── icon.png           # 扩展图标
├── docs/
│   └── analytics-format.md # 埋点格式文档
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

启动开发服务器，自动热重载。在浏览器中加载 `build/chrome-mv3-dev` 目录。

### 构建生产版本

```bash
pnpm build
```

构建产物位于 `build/chrome-mv3-prod` 目录。

### 打包发布

```bash
pnpm package
```

生成 `.crx` 或 `.zip` 文件用于发布。

## 配置说明

### API 地址配置

在 `src/config/index.ts` 中配置后端服务地址：

```typescript
// 开发环境
export const BASE_URL = 

// 生产环境
// export const BASE_URL = 
```

### 版本检查配置

支持以下检查间隔：
- 每次启动
- 每小时
- 每天
- 每周
- 从不

### 埋点上报配置

支持以下上报间隔：
- 实时上报
- 每分钟
- 每5分钟
- 每15分钟
- 退出时上报

## 功能详解

### 1. 智能执行

用户可从下拉列表选择预设配置，点击执行按钮运行分析任务。适用于 OA 审批单智能分析等场景。

### 2. 页面内容提取

- 提取页面标题、URL、正文文本
- 提取用户选中内容
- 提取页面链接和图片
- 支持导出为 TXT、Markdown、HTML 格式
- 自动过滤脚本、样式、导航等噪音元素

### 3. 版本管理

- 自动检测新版本
- 图标小红点提示
- 系统通知提醒
- 支持强制更新模式

### 4. 登录认证

- 支持 OA 登录
- 自动检测登录状态
- 未登录时显示引导界面

## 权限说明

| 权限 | 用途 |
|------|------|
| `tabs` | 访问标签页信息，用于页面内容提取 |
| `storage` | 存储用户设置和缓存数据 |
| `notifications` | 显示版本更新通知 |
| `sidePanel` | 打开浏览器侧边栏 |
| `alarms` | 定时任务（版本检查、埋点上报） |
| `host_permissions` | 访问所有 HTTPS 网站内容 |

## 开发指南

### 添加新功能模块

1. 在 `src/` 目录下创建新的 `.tsx` 或 `.ts` 文件
2. Plasmo 会自动识别并编译
3. 根据需要添加到 `manifest` 配置中

### 消息通信

扩展内部使用 Chrome Runtime API 进行消息传递：

```typescript
// 发送消息
chrome.runtime.sendMessage({ action: "check_version" })

// 接收消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractContent") {
    // 处理逻辑
  }
})
```

### 存储使用

- `chrome.storage.sync` - 同步存储，用于用户设置
- `chrome.storage.local` - 本地存储，用于缓存数据

## 许可证

MIT
