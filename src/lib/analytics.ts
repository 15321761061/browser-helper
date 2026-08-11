// src/lib/analytics.ts
import { getAnalyticsFlushInterval, BASE_URL } from "~config"

const ANALYTICS_API_URL = `${BASE_URL}/api/extension/analytics/batch`
const BATCH_SIZE = 5
const STORAGE_KEY = "analytics_event_queue"
const USER_INFO_KEY = "_user_info"

export interface TrackEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: number
}

// 用户信息缓存
interface UserInfo {
  id?: string
  name?: string
  email?: string
  department?: string
}

// 获取用户信息（带缓存）
async function getUserInfo(): Promise<UserInfo> {
  try {
    // 先从缓存读取，检查是否过期
    const cached = await chrome.storage.local.get([USER_INFO_KEY, "_user_info_expire"])
    const expireTime = cached._user_info_expire || 0
    
    if (cached[USER_INFO_KEY] && Date.now() < expireTime) {
      return cached[USER_INFO_KEY]
    }

    // 从接口获取
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      credentials: "include",
    })
    
    if (!res.ok) {
      return {}
    }

    const result = await res.json()
    const user = result?.data?.user
    
    if (!user) {
      return {}
    }

    // 提取用户信息
    const userInfo: UserInfo = {
      id: user.id || user._id || user.userId,
      name: user.name || user.username || user.displayName,
      email: user.email || user.mail,
      department: user.department || user.dept || user.organization,
    }

    // 缓存用户信息（24小时有效）
    await chrome.storage.local.set({ 
      [USER_INFO_KEY]: userInfo,
      _user_info_expire: Date.now() + 24 * 60 * 60 * 1000
    })

    return userInfo
  } catch (err) {
    console.error("[Analytics] 获取用户信息失败:", err)
    return {}
  }
}

// 清除用户信息缓存（登出时调用）
export async function clearUserInfoCache(): Promise<void> {
  await chrome.storage.local.remove([USER_INFO_KEY, "_user_info_expire"])
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

// 按钮ID到中文名称的映射（上报用）
export const BUTTON_NAME_MAP: Record<string, string> = {
  // Popup 按钮
  openSidePanel: "打开侧边栏",
  openDashboard: "打开工作台",
  openOptions: "打开设置",
  openConfig: "配置管理",
  openHistory: "历史任务",
  executeOption: "执行配置",
  extractContent: "提取页面内容",
  // Sidepanel 按钮
  open_dashboard: "打开工作台",
  open_settings: "打开设置",
}

// 页面ID到中文名称的映射（上报用）
export const PAGE_NAME_MAP: Record<string, string> = {
  popup: "弹窗",
  sidepanel: "侧边栏",
  options: "设置页",
  dashboard: "工作台",
}

// 生成匿名设备ID
async function getDeviceId(): Promise<string> {
  const r = await chrome.storage.local.get(["_device_id"])
  if (r._device_id) return r._device_id
  const id = crypto.randomUUID()
  await chrome.storage.local.set({ _device_id: id })
  return id
}

// 获取浏览器信息
function getBrowserInfo(): { browser: string; browser_version: string; os: string; os_version: string } {
  const ua = navigator.userAgent
  
  // 解析浏览器类型和版本
  let browser = "Unknown"
  let browserVersion = "Unknown"
  
  if (ua.includes("Edg/")) {
    browser = "Edge"
    browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || "Unknown"
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome"
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || "Unknown"
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox"
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || "Unknown"
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browser = "Safari"
    browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || "Unknown"
  }
  
  // 解析操作系统
  let os = "Unknown"
  let osVersion = "Unknown"
  
  if (ua.includes("Windows NT 10")) {
    os = "Windows"
    osVersion = "10"
  } else if (ua.includes("Windows NT 6.3")) {
    os = "Windows"
    osVersion = "8.1"
  } else if (ua.includes("Windows NT 6.1")) {
    os = "Windows"
    osVersion = "7"
  } else if (ua.includes("Mac OS X")) {
    os = "macOS"
    osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace("_", ".") || "Unknown"
  } else if (ua.includes("Linux")) {
    os = "Linux"
    osVersion = "Unknown"
  }
  
  return { browser, browser_version: browserVersion, os, os_version: osVersion }
}

// 获取当前页面URL
async function getCurrentTabUrl(): Promise<{ url: string; hostname: string; title: string } | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url) return null
    
    // 过滤内部页面
    if (tab.url.startsWith("chrome://") || 
        tab.url.startsWith("chrome-extension://") || 
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:")) {
      return null
    }
    
    const urlObj = new URL(tab.url)
    return {
      url: tab.url,
      hostname: urlObj.hostname,
      title: tab.title || ""
    }
  } catch (err) {
    console.error("[Analytics] 获取当前页面URL失败:", err)
    return null
  }
}

export async function track(event: string, properties: Record<string, any> = {}) {
  try {
    console.log(`[Analytics] 开始记录事件: ${event}`)

    const deviceId = await getDeviceId()
    const userInfo = await getUserInfo()
    const browserInfo = getBrowserInfo()
    const tabInfo = await getCurrentTabUrl()
    
    const payload: TrackEvent = {
      event,
      properties: {
        ...properties,
        // 事件名称（中文）
        event_name: EVENT_NAME_MAP[event] || event,
        // 设备信息
        _device_id: deviceId,
        _version: chrome.runtime.getManifest().version,
        // 浏览器信息
        _browser: browserInfo.browser,
        _browser_version: browserInfo.browser_version,
        _os: browserInfo.os,
        _os_version: browserInfo.os_version,
        // 用户信息
        _user_id: userInfo.id,
        _user_name: userInfo.name,
        _user_email: userInfo.email,
        _user_department: userInfo.department,
        // 页面信息
        _page_url: tabInfo?.url,
        _page_hostname: tabInfo?.hostname,
        _page_title: tabInfo?.title,
      },
      timestamp: Date.now(),
    }

    const r = await chrome.storage.local.get([STORAGE_KEY])
    const queue: TrackEvent[] = r[STORAGE_KEY] || []
    queue.push(payload)

    await chrome.storage.local.set({ [STORAGE_KEY]: queue })
    console.log(`[Analytics] 事件已加入队列，当前队列长度: ${queue.length}`)

    // 检查用户配置的上报间隔
    const interval = await getAnalyticsFlushInterval()
    console.log(`[Analytics] 用户配置的上报间隔: ${interval} 毫秒 (类型: ${typeof interval})`)

    // 实时上报：立即上报
    if (interval === 0) {
      console.log("[Analytics] 实时上报模式，立即上报")
      await flush()
      return
    }

    // 批量上报：达到批量大小才上报
    if (queue.length >= BATCH_SIZE) {
      console.log(`[Analytics] 队列达到 ${BATCH_SIZE} 条，批量上报`)
      await flush()
    }
  } catch (err) {
    console.error("[Analytics] track 函数执行出错:", err)
  }
}

export async function flush(): Promise<void> {
  try {
    const r = await chrome.storage.local.get([STORAGE_KEY])
    const queue: TrackEvent[] = r[STORAGE_KEY] || []
    if (queue.length === 0) {
      console.log("[Analytics] 队列为空，跳过上报")
      return
    }

    console.log(`[Analytics] 开始上报 ${queue.length} 条事件`)
    console.log(`[Analytics] 上报地址: ${ANALYTICS_API_URL}`)

    const res = await fetch(ANALYTICS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: queue }),
    })

    console.log(`[Analytics] HTTP 状态码: ${res.status}`)

    if (!res.ok) {
      console.warn("[Analytics] HTTP 错误，保留队列待下次重试")
      return
    }

    const data = await res.json()
    console.log("[Analytics] 服务器响应:", data)

    if (data?.code === 0) {
      await chrome.storage.local.set({ [STORAGE_KEY]: [] })
      console.log(`[Analytics] 上报成功 ${queue.length} 条`)
    } else {
      console.warn(`[Analytics] 服务端返回错误: ${data?.message || "未知错误"}，保留队列待下次重试`)
    }
  } catch (err) {
    console.error("[Analytics] flush 函数执行出错:", err)
  }
}

export const trackPageView = (page: string) => 
  track("page_view", { 
    page, 
    page_name: PAGE_NAME_MAP[page] || page 
  })

export const trackButtonClick = (buttonId: string, page: string, extra?: Record<string, any>) =>
  track("button_click", { 
    button_name: BUTTON_NAME_MAP[buttonId] || buttonId,
    page, 
    page_name: PAGE_NAME_MAP[page] || page,
    ...extra 
  })

export const trackFeatureUse = (feature: string, page: string, extra?: Record<string, any>) =>
  track("feature_use", { 
    feature, 
    page, 
    page_name: PAGE_NAME_MAP[page] || page,
    ...extra 
  })
