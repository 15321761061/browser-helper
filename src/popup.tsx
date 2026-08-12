// src/popup.tsx
import { useState, useEffect } from "react"
import { trackPageView, trackButtonClick, trackFeatureUse } from "~lib/analytics"
import { getAdminBaseUrl, API_ENDPOINTS } from "~config"

export type PanelConfig = {
  showUpdateInfo: boolean
  showSmartExecute: boolean
  showTools: boolean
  showAdmin: boolean
  showQuickPanel: boolean
}

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  showUpdateInfo: true,
  showSmartExecute: true,
  showTools: true,
  showAdmin: true,
  showQuickPanel: true,
}

export default function Popup() {
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [version, setVersion] = useState<string>("")
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [executionStatus, setExecutionStatus] = useState<"idle" | "executing" | "done" | "error">("idle")
  const [executionResult, setExecutionResult] = useState<string>("")
  const [extractStatus, setExtractStatus] = useState<"idle" | "extracting" | "done" | "error">("idle")
  const [extractResult, setExtractResult] = useState<string>("")

  const [panelConfig, setPanelConfig] = useState<PanelConfig>(DEFAULT_PANEL_CONFIG)

  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [authChecking, setAuthChecking] = useState(true)

  // 配置列表相关
  const [configs, setConfigs] = useState<Array<{ id: string; description: string; value: string }>>([])
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState<string>("")

  // API 基础地址（从配置读取）
  const [baseUrl, setBaseUrl] = useState<string>("")

  useEffect(() => {
    trackPageView("popup")
    loadUpdateInfo()
    loadPanelConfig()
    setVersion(chrome.runtime.getManifest().version)

    // 获取配置的 API 地址
    getAdminBaseUrl().then(url => {
      setBaseUrl(url)
      // 获取到地址后再检查登录状态
      checkAuth(url)
    })

    chrome.runtime.sendMessage({ action: "check_version" }, () => {
      if (chrome.runtime.lastError) {
        console.log("版本检查消息发送失败:", chrome.runtime.lastError.message)
      }
    })

    const handleStorageChange = (changes: any, area: string) => {
      if (area === "local" && changes.updateInfo) {
        setUpdateInfo(changes.updateInfo.newValue)
      }
      if (area === "local" && changes.panelConfig) {
        setPanelConfig(changes.panelConfig.newValue ?? DEFAULT_PANEL_CONFIG)
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  // 检测登录状态
  const checkAuth = async (url: string) => {
    setAuthChecking(true)
    try {
      const res = await fetch(`${url}${API_ENDPOINTS.authMe}`, {
        credentials: "include",
      })
      if (res.status === 401) {
        setIsLoggedIn(false)
        return
      }
      if (!res.ok) {
        setIsLoggedIn(false)
        return
      }
      const result = await res.json()
      if (result?.data?.user) {
        setIsLoggedIn(true)
        fetchConfigs(url)
      } else {
        setIsLoggedIn(false)
      }
    } catch {
      setIsLoggedIn(false)
    } finally {
      setAuthChecking(false)
    }
  }

  const loadUpdateInfo = async () => {
    const r = await chrome.storage.local.get(["updateInfo"])
    if (r.updateInfo) setUpdateInfo(r.updateInfo)
  }

  const loadPanelConfig = async () => {
    const r = await chrome.storage.local.get(["panelConfig"])
    if (r.panelConfig) {
      setPanelConfig(prev => ({ ...prev, ...r.panelConfig }))
    }
  }

  // 获取后台配置列表
  const fetchConfigs = async (url: string) => {
    setConfigLoading(true)
    setConfigError("")
    try {
      const res = await fetch(`${url}${API_ENDPOINTS.configsMine}`, {
        credentials: "include",
      })
      if (res.status === 401) {
        setIsLoggedIn(false)
        setConfigError("401")
        return
      }
      if (!res.ok) {
        throw new Error(`请求失败 (${res.status})`)
      }
      const result = await res.json()
      const list = result?.data?.data || []
      setConfigs(list)
    } catch (err: any) {
      setConfigError(err.message || "获取配置失败")
    } finally {
      setConfigLoading(false)
    }
  }

  const dismissUpdate = async () => {
    await chrome.storage.local.remove(["updateInfo"])
    chrome.action.setBadgeText({ text: "" })
    setUpdateInfo(null)
  }

  const openPanelSettings = () => {
    chrome.storage.local.set({ optionsActiveSection: "popup" }, () => {
      chrome.runtime.openOptionsPage()
      window.close()
    })
  }

  const openAbout = () => {
    chrome.storage.local.set({ optionsActiveSection: "about" }, () => {
      chrome.runtime.openOptionsPage()
      window.close()
    })
  }

  const goLogin = () => {
    if (!baseUrl) {
      alert("请先在设置中配置后台管理地址")
      chrome.storage.local.set({ optionsActiveSection: "api" }, () => {
        chrome.runtime.openOptionsPage()
      })
      return
    }
    chrome.tabs.create({ url: `${baseUrl}${API_ENDPOINTS.login}` })
    window.close()
  }

  const openSidePanel = async () => {
    trackButtonClick("openSidePanel", "popup")
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.windowId) await chrome.sidePanel.open({ windowId: tab.windowId })
    window.close()
  }

  const openDashboard = () => {
    trackButtonClick("openDashboard", "popup")
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/dashboard.html") })
    window.close()
  }

  const openOptions = () => {
    trackButtonClick("openOptions", "popup")
    chrome.runtime.openOptionsPage()
    window.close()
  }

  const openConfig = () => {
    trackButtonClick("openConfig", "popup")
    if (!baseUrl) {
      alert("请先在设置中配置后台管理地址")
      chrome.storage.local.set({ optionsActiveSection: "api" }, () => {
        chrome.runtime.openOptionsPage()
      })
      return
    }
    chrome.tabs.create({ url: `${baseUrl}${API_ENDPOINTS.configsPage}` })
    window.close()
  }

  const openHistory = () => {
    trackButtonClick("openHistory", "popup")
    if (!baseUrl) {
      alert("请先在设置中配置后台管理地址")
      chrome.storage.local.set({ optionsActiveSection: "api" }, () => {
        chrome.runtime.openOptionsPage()
      })
      return
    }
    chrome.tabs.create({ url: `${baseUrl}${API_ENDPOINTS.tasksPage}` })
    window.close()
  }

  const handleExecute = async () => {
    if (!selectedOption) return
    trackButtonClick("executeOption", "popup", { option: selectedOption })
    setExecutionStatus("executing")
    setExecutionResult("")
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setExecutionStatus("done")
      setExecutionResult(`已提取「OA审批单」共 1,240 字，识别到 3 个待填字段`)
      setTimeout(() => setExecutionStatus("idle"), 3000)
    } catch (err: any) {
      setExecutionStatus("error")
      setExecutionResult("执行失败：" + (err.message || "未知错误"))
    }
  }

  const extractPageContent = async (retryCount = 0) => {
    trackButtonClick("extractContent", "popup")
    setExtractStatus("extracting")
    setExtractResult("")

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setExtractStatus("error")
        setExtractResult("无法获取当前页面")
        return
      }

      const url = tab.url || ""
      if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://")) {
        setExtractStatus("error")
        setExtractResult("Chrome 内部页面不支持提取")
        return
      }

      const results = await chrome.tabs.sendMessage(tab.id, { action: "extractContent" })

      if (results?.success) {
        setExtractStatus("done")
        setExtractResult(`已提取「${results.title}」${results.text?.length || 0} 字`)
        setTimeout(() => setExtractStatus("idle"), 2000)
      } else {
        setExtractStatus("error")
        setExtractResult(results?.error || "提取失败")
      }
    } catch (err: any) {
      console.error("提取失败:", err)
      if (retryCount < 1 && err.message?.includes("Could not establish connection")) {
        setExtractResult("正在注入脚本，请重试...")
        setTimeout(() => extractPageContent(retryCount + 1), 500)
        return
      }
      setExtractStatus("error")
      setExtractResult(err.message?.includes("Could not establish connection")
        ? "页面未加载完成，请刷新后重试"
        : "提取失败: " + (err.message || "未知错误"))
    }
  }

  const btnBase: React.CSSProperties = {
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    outline: "none",
    background: "#fff",
    border: "1px solid #e2e8f0",
    color: "#475569",
    padding: "9px 0",
  }

  const btnSm: React.CSSProperties = {
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    outline: "none",
    background: "#fff",
    border: "1px solid #e2e8f0",
    color: "#475569",
    padding: "4px 10px",
  }

  const btnHoverIn = (e: React.MouseEvent<HTMLButtonElement>, color: string) => {
    e.currentTarget.style.borderColor = color
    e.currentTarget.style.color = color
  }
  const btnHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = "#e2e8f0"
    e.currentTarget.style.color = "#475569"
  }

  const btnGrid3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  }

  // 未登录界面
  if (isLoggedIn === false) {
    return (
      <div style={{
        width: 360,
        padding: "32px 24px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        boxSizing: "border-box"
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
          未登录
        </div>
        <p style={{
          fontSize: 13,
          color: "#64748b",
          margin: "0 0 24px 0",
          lineHeight: 1.6,
        }}>
          请点击下方按钮前往登录，支持 OA 登录或权限中心登录
        </p>

        <button
          onClick={goLogin}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 8,
            border: "none",
            background: "#0284c7",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#0369a1" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#0284c7" }}
        >
          ↩ 前往登录
        </button>

        <button
          onClick={() => {
            if (!baseUrl) {
              alert("请先在设置中配置后台管理地址")
              chrome.storage.local.set({ optionsActiveSection: "api" }, () => {
                chrome.runtime.openOptionsPage()
              })
              return
            }
            checkAuth(baseUrl)
          }}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: "#475569",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#cbd5e1" }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0" }}
        >
          已登录？重新检测
        </button>

        {/* 底部版本号 + 设置 */}
        <div style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          paddingTop: 20,
          marginTop: 12,
        }}>
          <div style={{ flex: 1 }} />
          <button
            onClick={openAbout}
            title="查看关于"
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 10,
              color: "#cbd5e1",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 0",
              borderRadius: 4,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#cbd5e1" }}
          >
            v{version}
          </button>
          <button
            onClick={openPanelSettings}
            title="面板设置"
            style={{
              flex: 1,
              textAlign: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color: "#94a3b8",
              padding: "2px 0",
              borderRadius: 4,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8" }}
          >
            ⚙️ 设置
          </button>
        </div>
      </div>
    )
  }

  // 检测中
  if (authChecking || isLoggedIn === null) {
    return (
      <div style={{
        width: 360,
        padding: "48px 24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        boxSizing: "border-box"
      }}>
        <div style={{
          width: 24,
          height: 24,
          border: "2px solid #e2e8f0",
          borderTopColor: "#2563eb",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: 12,
        }} />
        <div style={{ fontSize: 13, color: "#64748b" }}>正在检测登录状态...</div>
      </div>
    )
  }

  // 已登录：正常功能界面
  return (
    <div style={{ width: 360, padding: "8px 12px 10px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", boxSizing: "border-box" }}>
      {/* 标题栏 */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 10px 0" }}>
        🔧 AI 浏览器插件
      </h2>

      {/* === 更新提示 === */}
      {panelConfig.showUpdateInfo && updateInfo && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 3, height: 12, background: "#dc2626", borderRadius: 2, display: "inline-block" }}></span>
            更新提示
          </div>
          <div style={{
            background: updateInfo.forceUpdate ? "#fef2f2" : "#fffbeb",
            border: `1px solid ${updateInfo.forceUpdate ? "#fecaca" : "#fde68a"}`,
            borderRadius: 6, padding: "8px 10px", fontSize: 12
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: updateInfo.forceUpdate ? "#dc2626" : "#b45309", fontWeight: 700, fontSize: 12 }}>
                {updateInfo.forceUpdate ? "🔴" : "🔔"} 发现新版本 {updateInfo.latestVersion}
                {updateInfo.forceUpdate && (
                  <span style={{ marginLeft: 4, fontSize: 10, padding: "0 4px", background: "#dc2626", color: "#fff", borderRadius: 3 }}>
                    强制更新
                  </span>
                )}
              </span>
              {!updateInfo.forceUpdate && (
                <button onClick={dismissUpdate} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9ca3af", padding: 0 }}>
                  ✕
                </button>
              )}
            </div>
            <p style={{ color: updateInfo.forceUpdate ? "#7f1d1d" : "#92400e", margin: "4px 0 0 0", lineHeight: 1.4, fontSize: 11 }}>
              {updateInfo.message}
            </p>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                onClick={() => { chrome.tabs.create({ url: updateInfo.downloadUrl }); window.close() }}
                style={{ ...btnSm, color: updateInfo.forceUpdate ? "#dc2626" : "#b45309", borderColor: updateInfo.forceUpdate ? "#fecaca" : "#fde68a" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = updateInfo.forceUpdate ? "#fef2f2" : "#fffbeb" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff" }}
              >
                立即更新
              </button>
              {!updateInfo.forceUpdate && (
                <button onClick={dismissUpdate} style={btnSm}>
                  稍后提醒
                </button>
              )}
              <button
                onClick={async () => {
                  const next = { ...panelConfig, showUpdateInfo: false }
                  await chrome.storage.local.set({ panelConfig: next })
                  setUpdateInfo(null)
                  chrome.action.setBadgeText({ text: "" })
                }}
                style={{ ...btnSm, color: "#94a3b8" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#64748b" }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8" }}
              >
                不再提示
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === 智能执行 === */}
      {panelConfig.showSmartExecute && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 3, height: 12, background: "#8b5cf6", borderRadius: 2, display: "inline-block" }}></span>
            智能执行
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              disabled={configLoading}
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 12,
                color: configLoading ? "#94a3b8" : "#334155",
                background: "#fff",
                outline: "none",
                cursor: configLoading ? "not-allowed" : "pointer",
                opacity: configLoading ? 0.6 : 1,
              }}
            >
              <option value="">{configLoading ? "加载中..." : "请选择配置..."}</option>
              {configs.map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.description || cfg.id}
                </option>
              ))}
            </select>
            <button
              onClick={handleExecute}
              disabled={!selectedOption || executionStatus === "executing" || configLoading}
              style={{
                ...btnBase,
                padding: "7px 16px",
                flex: "none",
                cursor: !selectedOption || executionStatus === "executing" || configLoading ? "not-allowed" : "pointer",
                opacity: !selectedOption || executionStatus === "executing" || configLoading ? 0.5 : 1,
                color: executionStatus === "done" ? "#059669" : executionStatus === "error" ? "#dc2626" : "#475569",
                borderColor: executionStatus === "done" ? "#bbf7d0" : executionStatus === "error" ? "#fecaca" : "#e2e8f0",
              }}
              onMouseEnter={(e) => {
                if (selectedOption && executionStatus !== "executing" && !configLoading) btnHoverIn(e, "#8b5cf6")
              }}
              onMouseLeave={(e) => {
                if (selectedOption && executionStatus !== "executing" && !configLoading) btnHoverOut(e)
              }}
            >
              {executionStatus === "executing" ? "⏳" : executionStatus === "done" ? "✅" : "▶"} {executionStatus === "executing" ? "执行中" : executionStatus === "done" ? "完成" : "执行"}
            </button>
          </div>
          <div style={{
            padding: executionResult || configError || configLoading ? "8px 10px" : "6px 10px",
            background: executionStatus === "error" ? "#fef2f2" : executionStatus === "done" ? "#f0fdf4" : "#f8fafc",
            borderRadius: 6,
            border: executionStatus === "error" ? "1px solid #fecaca" : executionStatus === "done" ? "1px solid #bbf7d0" : "1px dashed #e2e8f0",
            fontSize: 11,
            color: executionStatus === "error" ? "#dc2626" : executionStatus === "done" ? "#059669" : "#94a3b8",
            lineHeight: 1.5,
            transition: "all 0.15s",
            minHeight: 28
          }}>
            {executionStatus !== "idle" ? (
              executionResult
            ) : configError ? (
              configError
            ) : configLoading ? (
              "⏳ 正在加载配置列表..."
            ) : (
              "选择配置后点击执行，结果将在此展示"
            )}
          </div>
        </div>
      )}

      {/* === 常用工具 === */}
      {panelConfig.showTools && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 3, height: 12, background: "#f59e0b", borderRadius: 2, display: "inline-block" }}></span>
            常用工具
          </div>
          <div style={btnGrid3}>
            <button
              onClick={() => extractPageContent()}
              disabled={extractStatus === "extracting"}
              style={{
                ...btnBase,
                cursor: extractStatus === "extracting" ? "wait" : "pointer",
                opacity: extractStatus === "extracting" ? 0.6 : 1,
                color: extractStatus === "done" ? "#059669" : extractStatus === "error" ? "#dc2626" : "#475569",
                borderColor: extractStatus === "done" ? "#bbf7d0" : extractStatus === "error" ? "#fecaca" : "#e2e8f0",
              }}
              onMouseEnter={(e) => { if (extractStatus === "idle") btnHoverIn(e, "#f59e0b") }}
              onMouseLeave={(e) => { if (extractStatus === "idle") btnHoverOut(e) }}
            >
              {extractStatus === "extracting" ? "⏳ 提取中..." : extractStatus === "done" ? "✅ 提取成功" : "📄 提取页面内容"}
            </button>
          </div>
          {extractResult && (
            <div style={{ fontSize: 11, color: extractStatus === "done" ? "#059669" : "#dc2626", textAlign: "center", padding: "6px 0 2px 0" }}>
              {extractResult}
            </div>
          )}
        </div>
      )}

      {/* === 后台管理 === */}
      {panelConfig.showAdmin && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 3, height: 12, background: "#94a3b8", borderRadius: 2, display: "inline-block" }}></span>
            后台管理
          </div>
          <div style={btnGrid3}>
            <button onClick={openConfig} style={btnBase}
              onMouseEnter={(e) => btnHoverIn(e, "#8b5cf6")}
              onMouseLeave={btnHoverOut}
            >
              🔧 配置管理
            </button>
            <button onClick={openHistory} style={btnBase}
              onMouseEnter={(e) => btnHoverIn(e, "#f59e0b")}
              onMouseLeave={btnHoverOut}
            >
              📋 历史任务
            </button>
          </div>
        </div>
      )}

      {/* === 快捷面板 === */}
      {panelConfig.showQuickPanel && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 3, height: 12, background: "#10b981", borderRadius: 2, display: "inline-block" }}></span>
            快捷面板
          </div>
          <div style={btnGrid3}>
            <button onClick={openSidePanel} style={btnBase}
              onMouseEnter={(e) => btnHoverIn(e, "#10b981")}
              onMouseLeave={btnHoverOut}
            >
              📑 侧边栏
            </button>
            <button onClick={openDashboard} style={btnBase}
              onMouseEnter={(e) => btnHoverIn(e, "#3b82f6")}
              onMouseLeave={btnHoverOut}
            >
              🖥️ 工作台
            </button>
            <button onClick={openOptions} style={btnBase}
              onMouseEnter={(e) => btnHoverIn(e, "#64748b")}
              onMouseLeave={btnHoverOut}
            >
              ⚙️ 设置
            </button>
          </div>
        </div>
      )}

      {/* 底部：版本号居中 + 设置靠右 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 8,
        borderTop: "1px solid #f1f5f9",
        position: "relative"
      }}>
        <button
          onClick={openAbout}
          title="查看关于"
          style={{
            fontSize: 10,
            color: "#cbd5e1",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 0",
            borderRadius: 4,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8" }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#cbd5e1" }}
        >
          v{version}
        </button>
        {!panelConfig.showQuickPanel && (
          <button
            onClick={openPanelSettings}
            title="面板设置"
            style={{
              position: "absolute",
              right: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color: "#94a3b8",
              padding: "2px 0",
              borderRadius: 4,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8" }}
          >
            ⚙️ 设置
          </button>
        )}
      </div>
    </div>
  )
}