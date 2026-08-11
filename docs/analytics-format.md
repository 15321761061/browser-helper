# 埋点上报格式文档

## 上报地址

```
POST https://gtech-tools-uat.dcin-test.digitalyili.com/api/extension/analytics/batch
Content-Type: application/json
```

## 请求体结构

```json
{
  "events": [
    {
      "event": "事件类型",
      "properties": {
        "event_name": "事件名称（中文）",
        ...
      },
      "timestamp": 1691234567890
    }
  ]
}
```

---

## 公共字段

所有事件都包含以下公共字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| `event` | 事件类型（英文） | `button_click` |
| `event_name` | 事件名称（中文） | `按钮点击` |
| `_device_id` | 匿名设备ID | UUID |
| `_version` | 扩展版本 | `1.0.0` |
| `_browser` | 浏览器类型 | `Chrome` / `Edge` |
| `_browser_version` | 浏览器版本 | `120.0` |
| `_os` | 操作系统 | `Windows` / `macOS` |
| `_os_version` | 操作系统版本 | `10` |
| `_user_id` | 用户ID | `12345` |
| `_user_name` | 用户姓名 | `张三` |
| `_user_email` | 用户邮箱 | `xxx@example.com` |
| `_user_department` | 用户部门 | `技术部` |
| `_page_url` | 当前页面URL | `https://...` |
| `_page_hostname` | 当前页面域名 | `example.com` |
| `_page_title` | 当前页面标题 | `页面标题` |
| `timestamp` | 时间戳（毫秒） | `1691234567890` |

---

## 事件类型

### 1. 页面浏览 (page_view)

**触发位置：** `popup.tsx:43`, `sidepanel.tsx:47`

```json
{
  "event": "page_view",
  "properties": {
    "event_name": "页面浏览",
    "_device_id": "xxx",
    "_version": "1.0.0",
    "_browser": "Chrome",
    "_browser_version": "120.0",
    "_os": "Windows",
    "_os_version": "10",
    "_user_id": "12345",
    "_user_name": "张三",
    "_user_email": "zhangsan@example.com",
    "_user_department": "技术部",
    "_page_url": "https://example.com/page",
    "_page_hostname": "example.com",
    "_page_title": "页面标题",
    "page": "popup",
    "page_name": "弹窗"
  },
  "timestamp": 1691234567890
}
```

**page 值：**
| page | page_name |
|------|-----------|
| popup | 弹窗 |
| sidepanel | 侧边栏 |
| options | 设置页 |
| dashboard | 工作台 |

---

### 2. 按钮点击 (button_click)

**触发位置：** `popup.tsx`, `sidepanel.tsx`

```json
{
  "event": "button_click",
  "properties": {
    "event_name": "按钮点击",
    "_device_id": "xxx",
    "_version": "1.0.0",
    "_browser": "Chrome",
    "_browser_version": "120.0",
    "_os": "Windows",
    "_os_version": "10",
    "_user_id": "12345",
    "_user_name": "张三",
    "_user_email": "zhangsan@example.com",
    "_user_department": "技术部",
    "_page_url": "https://example.com/page",
    "_page_hostname": "example.com",
    "_page_title": "页面标题",
    "button_name": "打开侧边栏",
    "page": "popup",
    "page_name": "弹窗"
  },
  "timestamp": 1691234567890
}
```

**带额外参数的按钮点击：**
```json
{
  "event": "button_click",
  "properties": {
    "event_name": "按钮点击",
    "button_name": "执行配置",
    "page": "popup",
    "page_name": "弹窗",
    "option": "config-123"
  },
  "timestamp": 1691234567890
}
```

**所有按钮名称：**

| button_name | 页面 | 触发位置 |
|-------------|------|----------|
| 打开侧边栏 | popup | popup.tsx:160 |
| 打开工作台 | popup | popup.tsx:167 |
| 打开设置 | popup | popup.tsx:173 |
| 配置管理 | popup | popup.tsx:179 |
| 历史任务 | popup | popup.tsx:185 |
| 执行配置 | popup/sidepanel | popup.tsx:192, sidepanel.tsx:110 |
| 提取页面内容 | popup/sidepanel | popup.tsx:207, sidepanel.tsx:134 |
| 打开工作台 | sidepanel | sidepanel.tsx:825 |
| 打开设置 | sidepanel | sidepanel.tsx:844 |

---

### 3. 功能使用 (feature_use)

**触发位置：** 暂无使用

```json
{
  "event": "feature_use",
  "properties": {
    "event_name": "功能使用",
    "_device_id": "xxx",
    "_version": "1.0.0",
    "_browser": "Chrome",
    "_browser_version": "120.0",
    "_os": "Windows",
    "_os_version": "10",
    "_user_id": "12345",
    "_user_name": "张三",
    "_user_email": "zhangsan@example.com",
    "_user_department": "技术部",
    "_page_url": "https://example.com/page",
    "_page_hostname": "example.com",
    "_page_title": "页面标题",
    "feature": "xxx",
    "page": "popup",
    "page_name": "弹窗"
  },
  "timestamp": 1691234567890
}
```

---

### 4. 提取成功 (extract_success)

**触发位置：** `sidepanel.tsx:170`

```json
{
  "event": "extract_success",
  "properties": {
    "event_name": "提取成功",
    "_device_id": "xxx",
    "_version": "1.0.0",
    "_browser": "Chrome",
    "_browser_version": "120.0",
    "_os": "Windows",
    "_os_version": "10",
    "_user_id": "12345",
    "_user_name": "张三",
    "_user_email": "zhangsan@example.com",
    "_user_department": "技术部",
    "_page_url": "https://example.com/page",
    "_page_hostname": "example.com",
    "_page_title": "页面标题",
    "page": "sidepanel",
    "page_name": "侧边栏",
    "url": "https://example.com/article",
    "textLength": 1234
  },
  "timestamp": 1691234567890
}
```

**特有字段：**
| 字段 | 说明 |
|------|------|
| `url` | 提取的页面URL |
| `textLength` | 提取的文本长度（字符数） |

---

### 5. 提取失败 (extract_fail)

**触发位置：** `sidepanel.tsx:174`, `sidepanel.tsx:182`

```json
{
  "event": "extract_fail",
  "properties": {
    "event_name": "提取失败",
    "_device_id": "xxx",
    "_version": "1.0.0",
    "_browser": "Chrome",
    "_browser_version": "120.0",
    "_os": "Windows",
    "_os_version": "10",
    "_user_id": "12345",
    "_user_name": "张三",
    "_user_email": "zhangsan@example.com",
    "_user_department": "技术部",
    "_page_url": "https://example.com/page",
    "_page_hostname": "example.com",
    "_page_title": "页面标题",
    "page": "sidepanel",
    "page_name": "侧边栏",
    "error": "页面未加载完成，请刷新后重试"
  },
  "timestamp": 1691234567890
}
```

**特有字段：**
| 字段 | 说明 |
|------|------|
| `error` | 错误信息 |

---

### 6. 文件导出 (export_file)

**触发位置：** `sidepanel.tsx:350`

```json
{
  "event": "export_file",
  "properties": {
    "event_name": "文件导出",
    "_device_id": "xxx",
    "_version": "1.0.0",
    "_browser": "Chrome",
    "_browser_version": "120.0",
    "_os": "Windows",
    "_os_version": "10",
    "_user_id": "12345",
    "_user_name": "张三",
    "_user_email": "zhangsan@example.com",
    "_user_department": "技术部",
    "_page_url": "https://example.com/page",
    "_page_hostname": "example.com",
    "_page_title": "页面标题",
    "page": "sidepanel",
    "page_name": "侧边栏",
    "format": "md"
  },
  "timestamp": 1691234567890
}
```

**特有字段：**
| 字段 | 说明 | 值 |
|------|------|-----|
| `format` | 导出格式 | `txt` / `md` / `html` |

---

### 7. 扩展启动 (extension_startup)

**触发位置：** `background.ts:14`

```json
{
  "event": "extension_startup",
  "properties": {
    "event_name": "extension_startup",
    "_device_id": "xxx",
    "_version": "1.0.0",
    "_browser": "Chrome",
    "_browser_version": "120.0",
    "_os": "Windows",
    "_os_version": "10",
    "_user_id": "12345",
    "_user_name": "张三",
    "_user_email": "zhangsan@example.com",
    "_user_department": "技术部",
    "_page_url": null,
    "_page_hostname": null,
    "_page_title": null,
    "trigger": "init"
  },
  "timestamp": 1691234567890
}
```

**特有字段：**
| 字段 | 说明 |
|------|------|
| `trigger` | 触发来源，固定为 `init` |

---

## 事件名称映射表

| event | event_name |
|-------|------------|
| page_view | 页面浏览 |
| button_click | 按钮点击 |
| feature_use | 功能使用 |
| extract_success | 提取成功 |
| extract_fail | 提取失败 |
| export_file | 文件导出 |
| extension_startup | extension_startup |

---

## 页面名称映射表

| page | page_name |
|------|-----------|
| popup | 弹窗 |
| sidepanel | 侧边栏 |
| options | 设置页 |
| dashboard | 工作台 |

---

## 按钮名称映射表

| button_id | button_name |
|-----------|-------------|
| openSidePanel | 打开侧边栏 |
| openDashboard | 打开工作台 |
| openOptions | 打开设置 |
| openConfig | 配置管理 |
| openHistory | 历史任务 |
| executeOption | 执行配置 |
| extractContent | 提取页面内容 |
| open_dashboard | 打开工作台 |
| open_settings | 打开设置 |

---

## 注意事项

1. **用户信息**：未登录时，`_user_id`、`_user_name`、`_user_email`、`_user_department` 字段为空
2. **页面信息**：在扩展内部页面（popup、sidepanel等）时，`_page_url`、`_page_hostname`、`_page_title` 字段为空
3. **浏览器信息**：自动从 `navigator.userAgent` 解析
4. **用户信息缓存**：用户信息缓存 24 小时，过期后自动重新获取
