// src/sidepanel.tsx
import { useState, useEffect } from "react"
import { track, trackButtonClick, trackFeatureUse, trackPageView } from "~lib/analytics"

type ExportFormat = "text" | "markdown" | "html"
type ViewTab = "text" | "selection" | "markdown" | "html"
type ResultType = "none" | "execute" | "extract"

interface ExtractedData {
  title: string
  url: string
  hostname: string
  description: string
  keywords: string
  text: string
  html: string
  selection: string
  links: Array<{ text: string; href: string }>
  images: Array<{ src: string; alt: string; width: number; height: number }>
  timestamp: number
}
 
const BASE_URL = "https://gtech-tools-uat.dcin-test.digitalyili.com"
// const BASE_URL = "https://gtech-form-assistant.dcin.digitalyili.com"

export default function SidePanel() {
  // === 登录状态 ===
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [authChecking, setAuthChecking] = useState(true)

  // === 通用结果展示状态 ===
  const [resultType, setResultType] = useState<ResultType>("none")
  const [resultTitle, setResultTitle] = useState<string>("")
  const [resultMeta, setResultMeta] = useState<string>("")
  const [resultContent, setResultContent] = useState<string>("")
  const [resultStatus, setResultStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [resultTip, setResultTip] = useState<string>("")
  const [activeTab, setActiveTab] = useState<ViewTab>("text")
  const [copyTip, setCopyTip] = useState<string>("")
  const [extracted, setExtracted] = useState<ExtractedData | null>(null)

  // === 智能执行状态 ===
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [configs, setConfigs] = useState<Array<{ id: string; description: string; value: string }>>([])
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState<string>("")

  useEffect(() => {
    trackPageView("sidepanel")
    checkAuth()
  }, [])

  const checkAuth = async () => {
    setAuthChecking(true)
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
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
        fetchConfigs()
      } else {
        setIsLoggedIn(false)
      }
    } catch {
      setIsLoggedIn(false)
    } finally {
      setAuthChecking(false)
    }
  }

  const fetchConfigs = async () => {
    setConfigLoading(true)
    setConfigError("")
    try {
      const res = await fetch(`${BASE_URL}/api/v1/configs/mine`, {
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

  const goLogin = () => {
    chrome.tabs.create({ url: `${BASE_URL}/login` })
  }

  const handleExecute = async () => {
    if (!selectedOption) return
    trackButtonClick("executeOption", "sidepanel", { option: selectedOption })

    setResultType("execute")
    setResultStatus("loading")
    setResultTitle("智能执行结果")
    setResultMeta(`配置: ${configs.find(c => c.id === selectedOption)?.description || selectedOption}`)
    setResultContent("")
    setResultTip("")
    setExtracted(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const mockResult = `已提取「OA审批单」共 1,240 字，识别到 3 个待填字段\n\n---\n\n【识别字段】\n1. 申请人姓名：张三\n2. 申请日期：2026-08-07\n3. 审批金额：¥50,000\n\n【建议】\n所有字段置信度 > 95%，可直接填充。`
      setResultContent(mockResult)
      setResultStatus("done")
      setResultTip("执行成功")
      setTimeout(() => setResultTip(""), 3000)
    } catch (err: any) {
      setResultContent("执行失败：" + (err.message || "未知错误"))
      setResultStatus("error")
    }
  }

  const extractCurrentPage = async () => {
    trackFeatureUse("extract_content", "sidepanel")

    setResultType("extract")
    setResultStatus("loading")
    setResultTitle("页面内容提取")
    setResultMeta("正在提取...")
    setResultContent("")
    setResultTip("")
    setExtracted(null)
    setActiveTab("text")

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setResultContent("无法获取当前页面")
        setResultStatus("error")
        return
      }

      const url = tab.url || ""
      if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
        setResultContent("Chrome 内部页面不支持提取")
        setResultStatus("error")
        return
      }

      const results = await chrome.tabs.sendMessage(tab.id, { action: "extractContent" })

      if (results?.success) {
        const data = results as ExtractedData
        setExtracted(data)
        setResultTitle(data.title)
        setResultMeta(`${data.hostname} | ${data.text.length} 字 | ${new Date(data.timestamp).toLocaleTimeString()}`)
        setResultContent(data.text)
        setResultStatus("done")
        setActiveTab(data.selection ? "selection" : "text")
        track("extract_success", { page: "sidepanel", url: tab.url, textLength: data.text?.length })
      } else {
        setResultContent(results?.error || "提取失败")
        setResultStatus("error")
        track("extract_fail", { page: "sidepanel", error: results?.error })
      }
    } catch (err: any) {
      console.error("提取失败:", err)
      setResultContent(err.message?.includes("Could not establish connection")
        ? "页面未加载完成，请刷新后重试"
        : "提取失败: " + (err.message || "未知错误"))
      setResultStatus("error")
      track("extract_fail", { page: "sidepanel", error: err.message })
    }
  }

  // ===== 导出相关 =====
  const getTextContent = (data: ExtractedData): string => {
    const lines = [
      `标题: ${data.title}`,
      `来源: ${data.url}`,
      `时间: ${new Date(data.timestamp).toLocaleString()}`,
      "",
      "========== 正文 ==========",
      data.text,
    ]
    if (data.selection) {
      lines.push("", "========== 选中内容 ==========", data.selection)
    }
    if (data.links.length > 0) {
      lines.push("", "========== 链接 ==========")
      data.links.forEach((l) => lines.push(`${l.text}: ${l.href}`))
    }
    return lines.join("\n")
  }

  const getMarkdownContent = (data: ExtractedData): string => {
    const lines = [
      `# ${data.title}`,
      "",
      `> **来源:** [${data.hostname}](${data.url})`,
      `> **提取时间:** ${new Date(data.timestamp).toLocaleString()}`,
      `> **字数:** ${data.text.length}`,
      "",
      "---",
      "",
    ]
    if (data.selection) {
      lines.push("## 选中内容", "", "> " + data.selection.replace(/\n/g, "\n> "), "", "---", "")
    }
    lines.push("## 正文", "", data.text, "")
    if (data.links.length > 0) {
      lines.push("## 链接", "")
      data.links.forEach((l) => {
        lines.push(`- [${l.text.replace(/\[/g, "\\[").replace(/\]/g, "\\]")}](${l.href})`)
      })
      lines.push("")
    }
    if (data.images.length > 0) {
      lines.push("## 图片", "")
      data.images.forEach((img) => {
        lines.push(`![${img.alt}](${img.src})`)
      })
      lines.push("")
    }
    return lines.join("\n")
  }

  const getHtmlContent = (data: ExtractedData): string => {
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

    const linkItems = data.links
      .map((l) => `<li><a href="${l.href}" target="_blank">${escapeHtml(l.text)}</a></li>`)
      .join("\n")

    const imageItems = data.images
      .map((img) => `<figure><img src="${img.src}" alt="${escapeHtml(img.alt)}" style="max-width:100%"><figcaption>${escapeHtml(img.alt)}</figcaption></figure>`)
      .join("\n")

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #334155; background: #fff; }
    h1 { font-size: 24px; color: #1e293b; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    .meta { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
    .meta a { color: #3b82f6; text-decoration: none; }
    .meta a:hover { text-decoration: underline; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid #3b82f6; }
    .content { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; white-space: pre-wrap; word-break: break-all; font-size: 14px; line-height: 1.8; }
    .selection-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; font-style: italic; color: #92400e; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    figure { margin: 16px 0; }
    figcaption { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 4px; }
    img { display: block; max-width: 100%; height: auto; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.title)}</h1>
  <div class="meta">
    来源: <a href="${data.url}" target="_blank">${data.hostname}</a> ·
    提取时间: ${new Date(data.timestamp).toLocaleString()} ·
    ${data.text.length} 字
  </div>

  ${data.selection ? `
  <div class="section">
    <div class="section-title">选中内容</div>
    <div class="selection-box">${escapeHtml(data.selection).replace(/\n/g, "<br>")}</div>
  </div>
  ` : ""}

  <div class="section">
    <div class="section-title">正文</div>
    <div class="content">${escapeHtml(data.text).replace(/\n/g, "<br>")}</div>
  </div>

  ${data.links.length > 0 ? `
  <div class="section">
    <div class="section-title">链接 (${data.links.length})</div>
    <ul>${linkItems}</ul>
  </div>
  ` : ""}

  ${data.images.length > 0 ? `
  <div class="section">
    <div class="section-title">图片 (${data.images.length})</div>
    ${imageItems}
  </div>
  ` : ""}
</body>
</html>`
  }

  const getDisplayContent = (): string => {
    if (resultType === "execute") return resultContent
    if (resultType === "extract" && extracted) {
      switch (activeTab) {
        case "text": return extracted.text
        case "selection": return extracted.selection
        case "markdown": return getMarkdownContent(extracted)
        case "html": return getHtmlContent(extracted)
        default: return extracted.text
      }
    }
    return resultContent
  }

  const getTabLabel = (tab: ViewTab): string => {
    if (!extracted) return tab
    switch (tab) {
      case "text": return `正文 ${extracted.text?.length || 0}字`
      case "selection": return `选中 ${extracted.selection?.length || 0}字`
      case "markdown": return "Markdown"
      case "html": return "HTML"
    }
  }

  const isTabDisabled = (tab: ViewTab): boolean => {
    if (!extracted) return true
    if (tab === "selection") return !extracted.selection
    return false
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    track("export_file", { format: filename.split(".").pop(), page: "sidepanel" })
  }

  const exportFile = (format: ExportFormat) => {
    if (!extracted) return
    const safeTitle = extracted.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 50) || "untitled"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const basename = `${safeTitle}_${timestamp}`

    switch (format) {
      case "text":
        downloadFile(getTextContent(extracted), `${basename}.txt`, "text/plain;charset=utf-8")
        break
      case "markdown":
        downloadFile(getMarkdownContent(extracted), `${basename}.md`, "text/markdown;charset=utf-8")
        break
      case "html":
        downloadFile(getHtmlContent(extracted), `${basename}.html`, "text/html;charset=utf-8")
        break
    }
    setCopyTip(`已导出 ${format.toUpperCase()}`)
    setTimeout(() => setCopyTip(""), 1500)
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

  const btnHoverIn = (e: React.MouseEvent<HTMLButtonElement>, color: string) => {
    e.currentTarget.style.borderColor = color
    e.currentTarget.style.color = color
  }
  const btnHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = "#e2e8f0"
    e.currentTarget.style.color = "#475569"
  }

  const resultBg = resultStatus === "error" ? "#fef2f2" : resultStatus === "done" ? "#f0fdf4" : "#f8fafc"
  const resultBorder = resultStatus === "error" ? "#fecaca" : resultStatus === "done" ? "#bbf7d0" : "#e2e8f0"
  const resultColor = resultStatus === "error" ? "#dc2626" : resultStatus === "done" ? "#059669" : "#94a3b8"

  // ===== 未登录界面 =====
  if (isLoggedIn === false) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: "32px 24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        textAlign: "center",
        background: "#f5f7fa",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
          请先登录
        </div>
        <p style={{
          fontSize: 13,
          color: "#64748b",
          margin: "0 0 24px 0",
          lineHeight: 1.6,
          maxWidth: 240,
        }}>
          登录后即可使用智能执行、页面提取等全部功能
        </p>

        <button
          onClick={goLogin}
          style={{
            width: "100%",
            maxWidth: 200,
            padding: "11px 0",
            borderRadius: 8,
            border: "none",
            background: "#8b5cf6",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#7c3aed" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#8b5cf6" }}
        >
          ↩ 前往登录
        </button>

        <button
          onClick={checkAuth}
          style={{
            width: "100%",
            maxWidth: 200,
            padding: "10px 0",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: "#475569",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#cbd5e1" }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0" }}
        >
          🔄 重新检测
        </button>
      </div>
    )
  }

  // ===== 检测中 =====
  if (authChecking || isLoggedIn === null) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#f5f7fa",
      }}>
        <div style={{
          width: 24,
          height: 24,
          border: "2px solid #e2e8f0",
          borderTopColor: "#8b5cf6",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: 12,
        }} />
        <div style={{ fontSize: 13, color: "#64748b" }}>正在检测登录状态...</div>
      </div>
    )
  }

  // ===== 已登录：正常功能界面 =====
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      padding: "16px 14px",
      background: "#f5f7fa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      boxSizing: "border-box",
      overflow: "hidden"
    }}>
      {/* 标题 */}
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span>📑</span> OA 审批助手
      </h1>

      {/* ===== 智能执行 ===== */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 3, height: 12, background: "#8b5cf6", borderRadius: 2, display: "inline-block" }}></span>
          智能执行
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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
            disabled={!selectedOption || resultStatus === "loading" || configLoading}
            style={{
              ...btnBase,
              padding: "7px 14px",
              flex: "none",
              cursor: !selectedOption || resultStatus === "loading" || configLoading ? "not-allowed" : "pointer",
              opacity: !selectedOption || resultStatus === "loading" || configLoading ? 0.5 : 1,
              color: resultStatus === "done" && resultType === "execute" ? "#059669" : resultStatus === "error" ? "#dc2626" : "#475569",
              borderColor: resultStatus === "done" && resultType === "execute" ? "#bbf7d0" : resultStatus === "error" ? "#fecaca" : "#e2e8f0",
            }}
            onMouseEnter={(e) => {
              if (selectedOption && resultStatus !== "loading" && !configLoading) btnHoverIn(e, "#8b5cf6")
            }}
            onMouseLeave={(e) => {
              if (selectedOption && resultStatus !== "loading" && !configLoading) btnHoverOut(e)
            }}
          >
            {resultStatus === "loading" && resultType === "execute" ? "⏳" : resultStatus === "done" && resultType === "execute" ? "✅" : "▶"}
            {" "}
            {resultStatus === "loading" && resultType === "execute" ? "执行中" : resultStatus === "done" && resultType === "execute" ? "完成" : "执行"}
          </button>
        </div>
      </div>

      {/* ===== 常用工具 ===== */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 3, height: 12, background: "#f59e0b", borderRadius: 2, display: "inline-block" }}></span>
          常用工具
        </div>
        <button
          onClick={extractCurrentPage}
          disabled={resultStatus === "loading" && resultType === "extract"}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: resultStatus === "loading" && resultType === "extract" ? "#f1f5f9" : "#fff",
            color: resultStatus === "loading" && resultType === "extract" ? "#94a3b8" : "#475569",
            fontSize: 13,
            fontWeight: 500,
            cursor: resultStatus === "loading" && resultType === "extract" ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!(resultStatus === "loading" && resultType === "extract")) {
              e.currentTarget.style.borderColor = "#f59e0b"
              e.currentTarget.style.color = "#f59e0b"
            }
          }}
          onMouseLeave={(e) => {
            if (!(resultStatus === "loading" && resultType === "extract")) {
              e.currentTarget.style.borderColor = "#e2e8f0"
              e.currentTarget.style.color = "#475569"
            }
          }}
        >
          {resultStatus === "loading" && resultType === "extract" ? "⏳ 提取中..." : "📄 提取页面内容"}
        </button>
      </div>

      {/* ===== 通用结果展示区 ===== */}
      {resultType !== "none" && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: 12,
          border: `1px solid ${resultBorder}`,
          overflow: "hidden",
          minHeight: 0
        }}>
          {/* 头部信息 */}
          <div style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${resultBorder}`,
            background: resultBg,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1e293b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                marginRight: 10
              }} title={resultTitle}>
                {resultTitle}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {resultTip && (
                  <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>{resultTip}</span>
                )}
                {copyTip && (
                  <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>{copyTip}</span>
                )}
                {resultType === "extract" && extracted && (
                  <>
                    <button
                      onClick={() => exportFile("text")}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e8f0" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9" }}
                    >
                      .txt
                    </button>
                    <button
                      onClick={() => exportFile("markdown")}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e8f0" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9" }}
                    >
                      .md
                    </button>
                    <button
                      onClick={() => exportFile("html")}
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e2e8f0" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9" }}
                    >
                      .html
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
              <span>{resultMeta}</span>
            </div>

            {resultType === "extract" && extracted && (
              <div style={{ display: "flex", gap: 6 }}>
                {(["text", "selection", "markdown", "html"] as ViewTab[]).map((tab) => {
                  const disabled = isTabDisabled(tab)
                  const isActive = activeTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => !disabled && setActiveTab(tab)}
                      disabled={disabled}
                      style={{
                        flex: 1,
                        padding: "5px 0",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: disabled ? "not-allowed" : "pointer",
                        border: "none",
                        background: disabled ? "#f1f5f9" : isActive ? "#3b82f6" : "#f1f5f9",
                        color: disabled ? "#cbd5e1" : isActive ? "#fff" : "#64748b",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                      title={disabled ? "无选中内容" : getTabLabel(tab)}
                    >
                      {getTabLabel(tab)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 内容展示 */}
          <div style={{ flex: 1, minHeight: 0, padding: 12, overflow: "auto", background: resultBg }}>
            {resultStatus === "loading" ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 10,
                color: "#94a3b8",
                fontSize: 13
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  border: "2px solid #e2e8f0",
                  borderTopColor: "#3b82f6",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                {resultType === "execute" ? "正在执行分析..." : "正在提取页面内容..."}
              </div>
            ) : (
              <textarea
                readOnly
                value={getDisplayContent()}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 120,
                  resize: "none",
                  background: resultStatus === "error" ? "#fef2f2" : "#f8fafc",
                  border: `1px solid ${resultBorder}`,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  color: resultColor,
                  lineHeight: 1.7,
                  fontFamily: resultType === "extract" ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                spellCheck={false}
              />
            )}
          </div>
        </div>
      )}

      {/* 无数据提示 */}
      {resultType === "none" && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          gap: 8
        }}>
          <div style={{ fontSize: 40 }}>📄</div>
          <p style={{ fontSize: 13 }}>选择上方功能开始操作</p>
          <p style={{ fontSize: 11, color: "#cbd5e1" }}>智能执行或提取页面内容，结果将在此展示</p>
        </div>
      )}

      {/* 底部操作 */}
      <div style={{
        marginTop: "auto",
        paddingTop: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flexShrink: 0
      }}>
        <button
          onClick={() => { trackButtonClick("open_dashboard", "sidepanel"); chrome.tabs.create({ url: chrome.runtime.getURL("tabs/dashboard.html") }) }}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 13,
            color: "#475569",
            cursor: "pointer",
            transition: "all 0.15s",
            fontWeight: 500
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff" }}
        >
          🖥️ 打开完整工作台
        </button>
        <button
          onClick={() => { trackButtonClick("open_settings", "sidepanel"); chrome.runtime.openOptionsPage() }}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 13,
            color: "#475569",
            cursor: "pointer",
            transition: "all 0.15s",
            fontWeight: 500
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff" }}
        >
          ⚙️ 打开设置
        </button>
      </div>
    </div>
  )
}