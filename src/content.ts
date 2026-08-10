// src/content.ts
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
  run_at: "document_idle"
}

function extractPageContent() {
  try {
    const title = document.title || ""
    const url = location.href
    const hostname = location.hostname

    // 清理噪音后的 body 副本
    const bodyClone = document.body.cloneNode(true) as HTMLElement
    const noiseSelectors = [
      "script", "style", "nav", "header", "footer",
      "aside", "[role=banner]", "[role=complementary]",
      ".ad", ".advertisement", ".sidebar", ".comments", "noscript"
    ]
    noiseSelectors.forEach((sel) => {
      bodyClone.querySelectorAll(sel).forEach((el) => el.remove())
    })

    // 纯文本（完整，不限长度）
    const rawText = bodyClone.innerText || ""
    const text = rawText.replace(/\s+/g, " ").trim()

    // 清理后的 HTML（完整）
    const html = bodyClone.innerHTML

    // 用户选中内容
    const selection = window.getSelection()?.toString() || ""

    // Meta
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content") || ""
    const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content") || ""

    // 链接
    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({
        text: (a as HTMLElement).innerText.trim().slice(0, 200),
        href: (a as HTMLAnchorElement).href
      }))
      .filter((l) => l.text && l.href.startsWith("http"))
      .slice(0, 100)

    // 图片
    const images = Array.from(document.querySelectorAll("img"))
      .filter((img) => img.naturalWidth > 100 || img.width > 100)
      .slice(0, 30)
      .map((img) => ({
        src: img.src,
        alt: img.alt || "",
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height
      }))

    return {
      success: true,
      title,
      url,
      hostname,
      description,
      keywords,
      text,
      html,
      selection,
      links,
      images,
      timestamp: Date.now()
    }
  } catch (err: any) {
    console.error("[ContentScript] 提取失败:", err)
    return { success: false, error: err.message }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[ContentScript] 收到消息:", message.action)

  if (message.action === "extractContent") {
    sendResponse(extractPageContent())
    return true
  }

  if (message.action === "manualAnalyze") {
    const data = extractPageContent()
    const analysis = {
      ...data,
      summary: data.text?.slice(0, 300) + (data.text?.length > 300 ? "..." : ""),
      keywords: data.keywords
        ? data.keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
        : []
    }
    sendResponse(analysis)
    return true
  }

  return false
})

console.log("[ContentScript] OA审批助手 content script 已加载:", location.href)