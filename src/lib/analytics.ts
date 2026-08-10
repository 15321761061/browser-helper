// src/lib/analytics.ts

const ANALYTICS_API_URL = "后台管理/api/extension/analytics/batch"
const BATCH_SIZE = 5
const FLUSH_INTERVAL_MS = 5 * 60 * 1000
const STORAGE_KEY = "analytics_event_queue"

export interface TrackEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: number
}

// 事件中文映射（前端展示用）
export const EVENT_NAME_MAP: Record<string, string> = {
  page_view: "页面浏览",
  button_click: "按钮点击",
  feature_use: "功能使用",
  extract_success: "提取成功",
  extract_fail: "提取失败",
  export_file: "文件导出",
}

export const EVENT_CATEGORY_MAP: Record<string, string> = {
  page_view: "页面",
  button_click: "交互",
  feature_use: "功能",
  extract_success: "功能",
  extract_fail: "功能",
  export_file: "功能",
}

// 生成匿名设备ID
async function getDeviceId(): Promise<string> {
  const r = await chrome.storage.local.get(["_device_id"])
  if (r._device_id) return r._device_id
  const id = crypto.randomUUID()
  await chrome.storage.local.set({ _device_id: id })
  return id
}

export async function track(event: string, properties: Record<string, any> = {}) {
  const deviceId = await getDeviceId()
  const payload: TrackEvent = {
    event,
    properties: {
      ...properties,
      _device_id: deviceId,
      _version: chrome.runtime.getManifest().version,
    },
    timestamp: Date.now(),
  }

  const r = await chrome.storage.local.get([STORAGE_KEY])
  const queue: TrackEvent[] = r[STORAGE_KEY] || []
  queue.push(payload)

  await chrome.storage.local.set({ [STORAGE_KEY]: queue })

  if (queue.length >= BATCH_SIZE) {
    flush()
  }
}

export async function flush(): Promise<void> {
  const r = await chrome.storage.local.get([STORAGE_KEY])
  const queue: TrackEvent[] = r[STORAGE_KEY] || []
  if (queue.length === 0) return

  try {
    const res = await fetch(ANALYTICS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: queue }),
    })

    if (!res.ok) {
      console.warn("[Analytics] HTTP 错误，保留队列待下次重试")
      return
    }

    const data = await res.json()
    if (data?.code === 0) {
      await chrome.storage.local.set({ [STORAGE_KEY]: [] })
      console.log(`[Analytics] 上报成功 ${queue.length} 条`)
    } else {
      console.warn(`[Analytics] 服务端返回错误: ${data?.message || "未知错误"}，保留队列待下次重试`)
    }
  } catch (err) {
    console.warn("[Analytics] 网络错误，保留队列:", err)
  }
}

export const trackPageView = (page: string) => track("page_view", { page })
export const trackButtonClick = (buttonId: string, page: string, extra?: Record<string, any>) =>
  track("button_click", { button_id: buttonId, page, ...extra })
export const trackFeatureUse = (feature: string, page: string, extra?: Record<string, any>) =>
  track("feature_use", { feature, page, ...extra })