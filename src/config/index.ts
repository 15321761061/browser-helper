// src/config/index.ts
// 统一配置管理

/**
 * 默认 API 基础地址
 * 用户需要在设置中心配置后台管理地址
 */
export const DEFAULT_BASE_URL = ""

/**
 * API 配置类型定义
 */
export interface ApiConfig {
  // 后台管理服务地址
  adminBaseUrl: string
  // 版本检查服务地址（可选，默认使用 adminBaseUrl）
  versionCheckUrl: string
  // API Key（可选）
  apiKey: string
}

/**
 * 默认 API 配置
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  adminBaseUrl: DEFAULT_BASE_URL,
  versionCheckUrl: "",
  apiKey: "",
}

/**
 * 获取 API 配置（从用户配置读取）
 */
export async function getApiConfig(): Promise<ApiConfig> {
  try {
    const result = await chrome.storage.sync.get(["oaSettings"])
    const settings = result.oaSettings || {}

    return {
      adminBaseUrl: settings.adminBaseUrl || DEFAULT_API_CONFIG.adminBaseUrl,
      versionCheckUrl: settings.versionCheckUrl || "",
      apiKey: settings.apiKey || "",
    }
  } catch (err) {
    console.error("[Config] 读取 API 配置失败:", err)
    return DEFAULT_API_CONFIG
  }
}

/**
 * 获取后台管理基础地址
 */
export async function getAdminBaseUrl(): Promise<string> {
  const config = await getApiConfig()
  return config.adminBaseUrl
}

/**
 * 获取版本检查 URL
 * 如果用户配置了单独的版本检查地址，则使用该地址
 * 否则使用后台管理地址拼接默认路径
 */
export async function getVersionCheckUrl(): Promise<string> {
  const config = await getApiConfig()
  if (config.versionCheckUrl) {
    return config.versionCheckUrl
  }
  return `${config.adminBaseUrl}/api/plugin/check-version?pluginName=oa-helper`
}

/**
 * 向后兼容：导出 BASE_URL（同步版本，用于初始化等场景）
 * @deprecated 请使用 getAdminBaseUrl() 获取可配置的地址
 */
export const BASE_URL = DEFAULT_BASE_URL

/**
 * 向后兼容：导出版本检查 URL（同步版本）
 * @deprecated 请使用 getVersionCheckUrl() 获取可配置的地址
 */
export const VERSION_CHECK_URL = `${DEFAULT_BASE_URL}/api/plugin/check-version?pluginName=oa-helper`

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

/**
 * API 端点路径配置
 * 这些路径会与 adminBaseUrl 拼接使用
 */
export const API_ENDPOINTS = {
  // 认证相关
  authMe: "/api/v1/auth/me",
  login: "/login",

  // 配置管理
  configsMine: "/api/v1/configs/mine",
  configsPage: "/configs",

  // 任务管理
  tasksPage: "/tasks",

  // 版本检查
  versionCheck: "/api/plugin/check-version?pluginName=oa-helper",
}

/**
 * 获取完整的 API URL
 * @param endpoint 端点路径
 */
export async function getApiUrl(endpoint: string): Promise<string> {
  const baseUrl = await getAdminBaseUrl()
  return `${baseUrl}${endpoint}`
}
