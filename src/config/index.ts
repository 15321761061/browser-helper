// src/config/index.ts
// 统一配置管理

/**
 * API 基础地址
 * 开发环境：https://gtech-tools-uat.dcin-test.digitalyili.com
 * 生产环境：https://gtech-form-assistant.dcin.digitalyili.com
 */
export const BASE_URL = "https://gtech-tools-uat.dcin-test.digitalyili.com"
// export const BASE_URL = "https://gtech-form-assistant.dcin.digitalyili.com"

/**
 * 版本检查接口
 */
export const VERSION_CHECK_URL = `${BASE_URL}/api/plugin/check-version?pluginName=oa-helper`

/**
 * 默认配置值
 */
export const DEFAULT_CONFIG = {
  versionCheckInterval: 60 * 60 * 1000,  // 默认1小时
  analyticsFlushInterval: 5 * 60 * 1000, // 默认5分钟
}

/**
 * 版本检查间隔选项
 */
export const VERSION_CHECK_OPTIONS = [
  { label: "每次启动", value: 0 },
  { label: "每小时", value: 60 * 60 * 1000 },
  { label: "每天", value: 24 * 60 * 60 * 1000 },
  { label: "每周", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "从不", value: -1 }
]

/**
 * 埋点上报间隔选项
 */
export const ANALYTICS_FLUSH_OPTIONS = [
  { label: "实时上报", value: 0 },
  { label: "每分钟", value: 60 * 1000 },
  { label: "每5分钟", value: 5 * 60 * 1000 },
  { label: "每15分钟", value: 15 * 60 * 1000 },
  { label: "退出时上报", value: -1 }
]

/**
 * 获取版本检查间隔（从用户配置读取）
 */
export async function getVersionCheckInterval(): Promise<number> {
  try {
    const result = await chrome.storage.sync.get(["oaSettings"])
    return result.oaSettings?.versionCheckInterval ?? DEFAULT_CONFIG.versionCheckInterval
  } catch {
    return DEFAULT_CONFIG.versionCheckInterval
  }
}

/**
 * 获取埋点上报间隔（从用户配置读取）
 */
export async function getAnalyticsFlushInterval(): Promise<number> {
  try {
    const result = await chrome.storage.sync.get(["oaSettings"])
    const value = result.oaSettings?.analyticsFlushInterval ?? DEFAULT_CONFIG.analyticsFlushInterval
    console.log(`[Config] 读取上报间隔配置: oaSettings=`, result.oaSettings, `返回值=${value}`)
    return value
  } catch (err) {
    console.error("[Config] 读取上报间隔配置失败:", err)
    return DEFAULT_CONFIG.analyticsFlushInterval
  }
}
