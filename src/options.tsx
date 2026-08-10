import { useState, useEffect } from "react"

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
  showQuickPanel: false, // ← 快捷面板默认不展示
}

function OptionsIndex() {
  const [activeSection, setActiveSection] = useState("general")
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    apiEndpoint: "",
    apiKey: "",
    theme: "light",
    autoFill: true,
    notifications: true,
    debugMode: false,
    shortcutKey: "Alt+O"
  })

  const [panelConfig, setPanelConfig] = useState<PanelConfig>(DEFAULT_PANEL_CONFIG)
  const [version, setVersion] = useState<string>("")
  const [manifestInfo, setManifestInfo] = useState({
    manifestVersion: "",
    author: "未设置",
    extVersion: "",
  })

  useEffect(() => {
    const manifest = chrome.runtime.getManifest()
    setVersion(manifest.version)
    setManifestInfo({
      manifestVersion: String(manifest.manifest_version),
      author: manifest.author || "未设置",
      extVersion: manifest.version,
    })

    chrome.storage?.local.get(["optionsActiveSection"], (result) => {
      if (result.optionsActiveSection) {
        setActiveSection(result.optionsActiveSection)
        chrome.storage.local.remove(["optionsActiveSection"])
      }
    })

    chrome.storage?.sync.get(["oaSettings"], (result) => {
      if (result.oaSettings) {
        setSettings(prev => ({ ...prev, ...result.oaSettings }))
      }
    })

    chrome.storage?.local.get(["panelConfig"], (result) => {
      if (result.panelConfig) {
        setPanelConfig(prev => ({ ...prev, ...result.panelConfig }))
      }
    })

    const handleStorageChange = (changes: any, area: string) => {
      if (area === "local" && changes.panelConfig) {
        setPanelConfig(changes.panelConfig.newValue ?? DEFAULT_PANEL_CONFIG)
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const handleSave = () => {
    chrome.storage?.sync.set({ oaSettings: settings }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const togglePanel = (key: keyof PanelConfig) => {
    setPanelConfig(prev => {
      const next = { ...prev, [key]: !prev[key] }
      chrome.storage?.local.set({ panelConfig: next })
      return next
    })
  }

  const menuItems = [
    { id: "general", label: "⚙️ 通用设置" },
    { id: "api", label: "🔌 API 配置" },
    { id: "popup", label: "🧩 Popup 布局" },
    { id: "advanced", label: "🧪 高级选项" },
    { id: "about", label: "ℹ️ 关于" },
  ]

  const panelItems: { key: keyof PanelConfig; label: string; desc: string; color: string }[] = [
    { key: "showUpdateInfo", label: "更新提示", desc: "新版本可用时在 popup 顶部显示更新通知", color: "#dc2626" },
    { key: "showSmartExecute", label: "智能执行", desc: "下拉选择配置并执行分析任务", color: "#8b5cf6" },
    { key: "showTools", label: "常用工具", desc: "提取页面内容等工具按钮", color: "#f59e0b" },
    { key: "showAdmin", label: "后台管理", desc: "配置管理、历史任务等后台入口", color: "#64748b" },
    { key: "showQuickPanel", label: "快捷面板", desc: "侧边栏、工作台、设置等快捷入口", color: "#10b981" },
  ]

  const changelog = [
    { version: manifestInfo.extVersion || "1.0.0", date: "2026-08-07", desc: "初始版本发布，支持 OA 审批单智能分析、页面内容提取、快捷面板等功能" },
  ]

  // 关于页不显示保存按钮
  const showSaveButtons = activeSection !== "about"

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#f8fafc" }}>
      
      {/* 左侧导航 */}
      <div style={{ width: 260, background: "#fff", borderRight: "1px solid #e2e8f0", padding: "24px 0", position: "fixed", height: "100vh" }}>
        <div style={{ padding: "0 24px 24px", borderBottom: "1px solid #e2e8f0" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0" }}>
            🔧 OA 审批助手
          </h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>扩展设置中心</p>
        </div>
        
        <nav style={{ padding: "16px 12px" }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: activeSection === item.id ? "#eff6ff" : "transparent",
                color: activeSection === item.id ? "#2563eb" : "#475569",
                fontSize: 14,
                fontWeight: activeSection === item.id ? 600 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "all 0.15s",
                marginBottom: 4
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 右侧内容区 */}
      <div style={{ marginLeft: 260, flex: 1, padding: "40px 48px", maxWidth: 800 }}>
        
        {saved && (
          <div style={{
            position: "fixed",
            top: 24,
            right: 24,
            background: "#10b981",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 10px 30px rgba(16, 185, 129, 0.3)",
            animation: "slideIn 0.3s ease",
            zIndex: 100
          }}>
            ✓ 设置已保存
          </div>
        )}

        {/* ===== 通用设置 ===== */}
        {activeSection === "general" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0" }}>通用设置</h2>
            <p style={{ color: "#64748b", margin: "0 0 32px 0", fontSize: 14 }}>配置扩展的基本行为</p>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <SettingRow label="主题模式" description="选择扩展界面的配色方案">
                <select
                  value={settings.theme}
                  onChange={(e) => updateSetting("theme", e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    background: "#fff",
                    minWidth: 140,
                    cursor: "pointer"
                  }}
                >
                  <option value="light">☀️ 浅色模式</option>
                  <option value="dark">🌙 深色模式</option>
                  <option value="auto">🔄 跟随系统</option>
                </select>
              </SettingRow>

              <SettingRow label="自动填充" description="打开审批页面时自动填充常用字段">
                <Toggle checked={settings.autoFill} onChange={(v) => updateSetting("autoFill", v)} />
              </SettingRow>

              <SettingRow label="通知提醒" description="审批状态变更时弹出通知">
                <Toggle checked={settings.notifications} onChange={(v) => updateSetting("notifications", v)} />
              </SettingRow>

              <SettingRow label="快捷键" description="打开扩展弹窗的快捷键">
                <input
                  value={settings.shortcutKey}
                  onChange={(e) => updateSetting("shortcutKey", e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    width: 120,
                    textAlign: "center"
                  }}
                />
              </SettingRow>
            </div>
          </div>
        )}

        {/* ===== API 配置 ===== */}
        {activeSection === "api" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0" }}>API 配置</h2>
            <p style={{ color: "#64748b", margin: "0 0 32px 0", fontSize: 14 }}>配置后端服务接口地址</p>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <SettingRow label="API 地址" description="后端服务的基础 URL">
                <input
                  type="url"
                  placeholder="https://api.example.com"
                  value={settings.apiEndpoint}
                  onChange={(e) => updateSetting("apiEndpoint", e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    width: 280
                  }}
                />
              </SettingRow>

              <SettingRow label="API Key" description="访问接口的认证密钥">
                <input
                  type="password"
                  placeholder="sk-xxxxxxxx"
                  value={settings.apiKey}
                  onChange={(e) => updateSetting("apiKey", e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    width: 280,
                    fontFamily: "monospace"
                  }}
                />
              </SettingRow>
            </div>

            <div style={{
              marginTop: 16,
              padding: 12,
              background: "#fef3c7",
              borderRadius: 8,
              fontSize: 13,
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span>🔒</span>
              API Key 仅存储在本地，不会上传到任何服务器
            </div>
          </div>
        )}

        {/* ===== Popup 布局 ===== */}
        {activeSection === "popup" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0" }}>Popup 布局</h2>
            <p style={{ color: "#64748b", margin: "0 0 32px 0", fontSize: 14 }}>控制 popup 弹窗中各功能面板的显示与隐藏</p>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              {panelItems.map((item, idx) => (
                <div
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    borderBottom: idx < panelItems.length - 1 ? "1px solid #f1f5f9" : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: item.color,
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{item.desc}</div>
                    </div>
                  </div>
                  <Toggle
                    checked={panelConfig[item.key]}
                    onChange={() => togglePanel(item.key)}
                  />
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 16,
              padding: 12,
              background: "#eff6ff",
              borderRadius: 8,
              fontSize: 13,
              color: "#1e40af",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span>💡</span>
              修改后即时生效，无需刷新页面
            </div>
          </div>
        )}

        {/* ===== 高级选项 ===== */}
        {activeSection === "advanced" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0" }}>高级选项</h2>
            <p style={{ color: "#64748b", margin: "0 0 32px 0", fontSize: 14 }}>开发者调试相关配置</p>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <SettingRow label="调试模式" description="在控制台输出详细日志">
                <Toggle checked={settings.debugMode} onChange={(v) => updateSetting("debugMode", v)} />
              </SettingRow>

              <SettingRow label="清除缓存" description="清除扩展本地存储的所有数据">
                <button
                  onClick={() => {
                    chrome.storage?.sync.clear(() => alert("缓存已清除"))
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #ef4444",
                    background: "#fff",
                    color: "#ef4444",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff" }}
                >
                  🗑️ 清除数据
                </button>
              </SettingRow>
            </div>
          </div>
        )}

        {/* ===== 关于 ===== */}
        {activeSection === "about" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", margin: "0 0 8px 0" }}>关于</h2>
            <p style={{ color: "#64748b", margin: "0 0 32px 0", fontSize: 14 }}>扩展版本和相关信息</p>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🔧</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#1e293b" }}>OA 审批助手</h3>
                <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>版本 {version} | Powered by Plasmo</p>
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                <InfoRow label="扩展版本" value={manifestInfo.extVersion} />
                <InfoRow label="Manifest 版本" value={`V${manifestInfo.manifestVersion}`} />
                <InfoRow label="作者" value={manifestInfo.author} />
              </div>
            </div>

            {/* 版本说明 */}
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", margin: "0 0 16px 0" }}>📋 版本说明</h3>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {changelog.map((item, idx) => (
                  <div
                    key={item.version}
                    style={{
                      padding: "16px 24px",
                      borderBottom: idx < changelog.length - 1 ? "1px solid #f1f5f9" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#2563eb",
                        background: "#eff6ff",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}>
                        v{item.version}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{item.date}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 保存按钮：关于页不显示 */}
        {showSaveButtons && (
          <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
            <button
              onClick={handleSave}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1d4ed8"
                e.currentTarget.style.transform = "translateY(-1px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#2563eb"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              💾 保存设置
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#475569",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              🔄 重置
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 24px",
      borderBottom: "1px solid #f1f5f9"
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{description}</div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: checked ? "#2563eb" : "#cbd5e1",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        padding: 0
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        position: "absolute",
        top: 2,
        left: checked ? 22 : 2,
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }} />
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: "#1e293b", fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default OptionsIndex