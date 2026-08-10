// src/background.ts
import { flush, track } from "~lib/analytics"

const VERSION_CHECK_URL = "https://gtech-tools-uat.dcin-test.digitalyili.com/api/plugin/check-version?pluginName=oa-helper"
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1小时

// ========== 初始化触发 ==========
chrome.runtime.onStartup.addListener(init)
chrome.runtime.onInstalled.addListener(init)

async function init() {
  checkVersion()
  track("extension_startup", { trigger: "init" })
}

// ========== 版本检查核心逻辑 ==========
export async function checkVersion() {
  try {
    // 防频繁检查
    const { lastVersionCheck } = await chrome.storage.local.get("lastVersionCheck")
    if (lastVersionCheck && Date.now() - lastVersionCheck < CHECK_INTERVAL_MS) {
      console.log("[VersionCheck] 距离上次检查不到1小时，跳过")
      return
    }

    const manifest = chrome.runtime.getManifest()
    const currentVersion = manifest.version

    console.log("[VersionCheck] 开始检查，当前版本:", currentVersion)

    const res = await fetch(VERSION_CHECK_URL)
    if (!res.ok) {
      console.warn("[VersionCheck] 接口返回非200:", res.status)
      return
    }

    const data = await res.json()
    console.log("[VersionCheck] 远程返回:", data)

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

      // 非强制更新才弹系统通知（强制更新在popup里处理更直观）
      if (!updateInfo.forceUpdate) {
        chrome.notifications.create("update-available", {
          type: "basic",
          iconUrl: "icon.png",
          title: "OA 审批助手 - 发现新版本",
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

// ========== 点击通知按钮 ==========
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === "update-available" && buttonIndex === 0) {
    chrome.storage.local.get(["updateInfo"], (r) => {
      const url = r.updateInfo?.downloadUrl || "https://gtech-tools-uat.dcin-test.digitalyili.com"
      chrome.tabs.create({ url })
    })
  }
})

// ========== 监听来自 popup 的主动检查请求 ==========
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "check_version") {
    checkVersion().then(() => sendResponse({ success: true }))
    return true // 保持异步通道
  }
  if (message.action === "analytics_flush") {
    flush().then(() => sendResponse({ success: true }))
    return true
  }
})

// ========== 埋点定时上报 ==========
const ANALYTICS_FLUSH_INTERVAL = 5 * 60 * 1000
setInterval(() => {
  flush()
}, ANALYTICS_FLUSH_INTERVAL)

chrome.runtime.onSuspend.addListener(() => {
  flush()
})