// src/background.ts
import { flush, track } from "~lib/analytics"
import { VERSION_CHECK_URL, BASE_URL, getVersionCheckInterval, getAnalyticsFlushInterval } from "~config"

// ========== 定时器管理 ==========
let versionCheckAlarmName = "version-check"
let analyticsFlushAlarmName = "analytics-flush"

// ========== 初始化触发 ==========
chrome.runtime.onStartup.addListener(init)
chrome.runtime.onInstalled.addListener(init)

async function init() {
  track("extension_startup", { trigger: "init" })

  // 初始化版本检查
  await setupVersionCheck()

  // 初始化埋点上报
  await setupAnalyticsFlush()

  // 监听配置变化
  setupConfigListener()
}

// ========== 版本检查核心逻辑 ==========
export async function checkVersion() {
  try {
    const interval = await getVersionCheckInterval()
    console.log("[VersionCheck] 当前配置的检查间隔:", interval, "毫秒")

    // 如果用户选择"从不"，直接返回
    if (interval === -1) {
      console.log("[VersionCheck] 用户已禁用自动检查")
      return
    }

    // 防频繁检查（仅对非"每次启动"的配置生效）
    if (interval > 0) {
      const { lastVersionCheck } = await chrome.storage.local.get("lastVersionCheck")
      if (lastVersionCheck && Date.now() - lastVersionCheck < interval) {
        console.log("[VersionCheck] 距离上次检查时间未到，跳过")
        return
      }
    }

    const manifest = chrome.runtime.getManifest()
    const currentVersion = manifest.version

    console.log("[VersionCheck] 开始检查，当前版本:", currentVersion)
    console.log("[VersionCheck] 请求地址:", VERSION_CHECK_URL)

    const res = await fetch(VERSION_CHECK_URL)
    if (!res.ok) {
      console.warn("[VersionCheck] 接口返回非200:", res.status)
      return
    }

    const data = await res.json()
    console.log("[VersionCheck] 远程返回:", data)
    console.log("[VersionCheck] 远程版本:", data.version, "本地版本:", currentVersion)

    if (data.version && data.version !== currentVersion) {
      console.log("[VersionCheck] 发现新版本:", data.version)

      const updateInfo = {
        currentVersion,
        latestVersion: data.version,
        downloadUrl: data.downloadUrl || "",
        message: data.message || `发现新版本 ${data.version}，请尽快更新`,
        forceUpdate: data.forceUpdate === true,
        checkedAt: Date.now()
      }

      await chrome.storage.local.set({
        updateInfo,
        lastVersionCheck: Date.now()
      })

      // 图标打小红点
      chrome.action.setBadgeText({ text: "!" })
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" })

      // 非强制更新才弹系统通知
      if (!updateInfo.forceUpdate) {
        chrome.notifications.create("update-available", {
          type: "basic",
          iconUrl: "icon.png",
          title: "AI 浏览器插件 - 发现新版本",
          message: updateInfo.message,
          buttons: [{ title: "立即更新" }]
        })
      }
    } else {
      console.log("[VersionCheck] 版本一致，无需更新")
      await chrome.storage.local.remove(["updateInfo"])
      chrome.action.setBadgeText({ text: "" })
    }

    await chrome.storage.local.set({ lastVersionCheck: Date.now() })
  } catch (err) {
    console.error("[VersionCheck] 版本检查失败:", err)
  }
}

// ========== 设置版本检查定时器 ==========
async function setupVersionCheck() {
  const interval = await getVersionCheckInterval()

  // 清除现有的定时器
  await chrome.alarms.clear(versionCheckAlarmName)

  if (interval === -1) {
    console.log("[VersionCheck] 用户选择从不检查，已停止定时器")
    return
  }

  if (interval === 0) {
    // "每次启动" - 不设置定时器，仅在启动时检查一次
    console.log("[VersionCheck] 用户选择每次启动检查")
    checkVersion()
    return
  }

  // 设置定时器
  chrome.alarms.create(versionCheckAlarmName, {
    delayInMinutes: interval / 60000,
    periodInMinutes: interval / 60000
  })

  console.log(`[VersionCheck] 已设置定时器，间隔: ${interval / 60000} 分钟`)

  // 立即执行一次检查
  checkVersion()
}

// ========== 设置埋点上报定时器 ==========
async function setupAnalyticsFlush() {
  const interval = await getAnalyticsFlushInterval()

  // 清除现有的定时器
  await chrome.alarms.clear(analyticsFlushAlarmName)

  if (interval === -1) {
    console.log("[Analytics] 用户选择退出时上报，已停止定时器")
    return
  }

  if (interval === 0) {
    // "实时上报" - 不设置定时器，由各处调用时立即上报
    console.log("[Analytics] 用户选择实时上报")
    return
  }

  // 设置定时器
  chrome.alarms.create(analyticsFlushAlarmName, {
    delayInMinutes: interval / 60000,
    periodInMinutes: interval / 60000
  })

  console.log(`[Analytics] 已设置定时器，间隔: ${interval / 60000} 分钟`)
}

// ========== 监听配置变化 ==========
function setupConfigListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.oaSettings) {
      const newSettings = changes.oaSettings.newValue
      const oldSettings = changes.oaSettings.oldValue

      // 版本检查间隔变化
      if (newSettings?.versionCheckInterval !== oldSettings?.versionCheckInterval) {
        console.log("[Config] 版本检查间隔已变更，重新设置定时器")
        setupVersionCheck()
      }

      // 埋点上报间隔变化
      if (newSettings?.analyticsFlushInterval !== oldSettings?.analyticsFlushInterval) {
        console.log("[Config] 埋点上报间隔已变更，重新设置定时器")
        setupAnalyticsFlush()
      }
    }
  })
}

// ========== 监听定时器触发 ==========
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === versionCheckAlarmName) {
    checkVersion()
  } else if (alarm.name === analyticsFlushAlarmName) {
    flush()
  }
})

// ========== 点击通知按钮 ==========
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === "update-available" && buttonIndex === 0) {
    chrome.storage.local.get(["updateInfo"], (r) => {
      const url = r.updateInfo?.downloadUrl || BASE_URL
      chrome.tabs.create({ url })
    })
  }
})

// ========== 监听来自 popup 的消息 ==========
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "check_version") {
    // 手动检查版本（不受"从不"限制）
    checkVersion().then(() => sendResponse({ success: true }))
    return true
  }
  if (message.action === "analytics_flush") {
    flush().then(() => sendResponse({ success: true }))
    return true
  }
  // 接收来自 popup 的埋点日志
  if (message.action === "analytics_log") {
    console.log(`[Analytics - Popup] ${message.log}`)
    sendResponse({ success: true })
    return true
  }
})

// ========== 扩展卸载时上报 ==========
chrome.runtime.onSuspend.addListener(() => {
  flush()
})
