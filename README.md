## 浏览器扩展页面的章节，主要介绍了以下几类扩展页面的创建方式：
| 页面类型                 | 创建文件                                    | 说明                |
| -------------------- | --------------------------------------- | ----------------- |
| **弹出页面 (Popup)**     | `popup.tsx` 或 `popup/index.tsx`         | 点击工具栏扩展图标时打开的小对话框 |
| **选项页面 (Options)**   | `options.tsx` 或 `options/index.tsx`     | 扩展的设置与配置页面        |
| **新标签页 (New Tab)**   | `newtab.tsx` 或 `newtab/index.tsx`       | 覆盖浏览器默认新标签页       |
| **侧边栏 (Side Panel)** | `sidepanel.tsx` 或 `sidepanel/index.tsx` | 在浏览器侧边栏中持久显示的 UI  |
| **开发者工具 (DevTools)** | `devtools.tsx` 或 `devtools/index.tsx`   | 扩展的开发者工具页面        |


  
 这是 **Plasmo 消息传递 API** 的中文文档，核心内容整理如下：

---

## 📦 安装步骤

1. **安装依赖**：`npm install @plasmohq/messaging`
2. **创建 `background` 目录**：后台服务工作者必须位于 `background/index.ts`，所有消息处理器放在 `background/*` 下
3. **生成静态类型**：编译时自动生成，支持 `sendToBackground` 和 `relayMessage` 的 IntelliSense

---

## 🔄 三种通信流

### 1. 消息流（Message Flow）—— 一次性消息
用于扩展页面/内容脚本 ↔ 后台服务工作者之间的单次通信。

```ts
// background/messages/ping.ts
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  res.send({ message: "pong" })
}
export default handler
```

```ts
// 发送端
const resp = await sendToBackground({ name: "ping", body: { id: 123 } })
```

### 2. 中继流（Relay Flow）—— 网页 ↔ 后台
通过内容脚本中的 `relayMessage` 作为中继，让**目标网页**与后台服务工作者通信（替代 Chrome 的 `externally_connectable`）。

```ts
// 内容脚本中注册中继
relayMessage({ name: "ping" })
```

```ts
// 网页端发送
const resp = await sendToBackgroundViaRelay({ name: "ping", body: { id: 123 } })
```

### 3. 端口（Ports）—— 长期连接
对 Chrome `runtime.Port` 的高级抽象，用于建立持久连接。

```ts
// background/ports/ailtab.ts
const handler: PlasmoMessaging.PortHandler = async (req, res) => {
  res.send({ message: "Hello from port" })
}
export default handler
```

```ts
// React 中使用
const { data, send } = usePort("ailtab")
```

---

## 🔑 关键特性

| 特性 | 说明 |
|------|------|
| **声明式** | 按目录结构自动注册处理器 |
| **类型安全** | 消息名称静态类型化，支持 IntelliSense |
| **基于 Promise** | 异步、函数式 API |
| **内容脚本主世界** | 发送消息需包含扩展 ID |

---

## 下面针对 4 个高频实战场景 给出可直接落地的代码示例，覆盖三种通信流的核心用法：

### 场景 1：内容脚本采集网页数据 → 后台处理并返回结果
 - 适用：内容脚本抓取 DOM 数据，交给后台做 API 调用或持久化。

### 场景 2：后台主动推送状态到 Popup（Port 长连接）
 - 适用：后台有持续变化的状态（如扫描进度、WebSocket 消息），需要实时同步到 Popup。

### 场景 3：网页 JS 与扩展后台通信（Relay Flow）
 - 适用：在宿主页面注入脚本，让页面上的业务代码能安全调用扩展能力（如读取扩展存储、调用扩展专属 API）。

### 场景 4：Popup 触发后台下载任务并监听完成（Message + Port 组合）
 - 适用：Popup 发起一个耗时任务，通过 Port 监听实时进度，最后通过 Message 获取最终结果。

## 💡 选型速查


| 场景        | 推荐方式              | 关键 API                                      |
| --------- | ----------------- | ------------------------------------------- |
| 单次请求-响应   | Message Flow      | `sendToBackground`                          |
| 网页 ↔ 扩展   | Relay Flow        | `relayMessage` + `sendToBackgroundViaRelay` |
| 实时状态同步    | Port              | `usePort` / `getPort`                       |
| 耗时任务 + 进度 | Port + Message 组合 | `sendToBackground` 启动 + `usePort` 监听        |

### 场景 1 的完整集成方案 - 内容脚本采集网页数据 → 后台处理并返回结果
 - 适用：内容脚本抓取 DOM 数据，交给后台做 API 调用或持久化。
1. 安装依赖
``` npm install @plasmohq/messaging ```
2. 创建后台消息处理器
 - 新建文件：src/background/messages/analyzePage.ts
3. 创建内容脚本（自动采集）
 - 新建文件：src/contents/page-scraper.ts
``` // 监听鼠标松开事件：用户选中文本后触发分析 ```
4. 修改 Popup（展示最近分析结果）
 - 修改 src/popup.tsx：在底部增加最近分析结果卡片
5. 修改 Dashboard（实时展示分析结果）
 - 修改 src/tabs/dashboard.tsx：增加分析结果展示区域

### 验证步骤
 - npm run dev 启动后，在任意网页选中文本（至少 5 个字符）
 - 页面右下角会出现蓝色 Toast 提示分析结果
 - 打开 Popup → 底部显示最近分析摘要
 - 打开 Dashboard → 显示完整分析结果和关键词标签
 - 打开 DevTools → Background Service Worker 控制台可看到详细日志