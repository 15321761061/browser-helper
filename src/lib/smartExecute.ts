// src/lib/smartExecute.ts
// 智能执行核心逻辑

import { htmlToMarkdown } from "../../htmlToMarkdown"
import { getModelConfig } from "~config"

/**
 * 配置类型定义
 */
export interface SmartExecuteConfig {
  id: string
  description: string
  value: string
  format?: string
}

/**
 * 场景类型
 */
export type ExecuteScenario = "prompt" | "dify"

/**
 * Dify 配置
 */
export interface DifyConfig {
  AIDIFY_WORKFLOW_BASE_URL: string
  AIDIFY_WORKFLOW_V1_API_KEY: string
}

/**
 * 执行结果
 */
export interface ExecuteResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * 判断配置的场景类型
 * @param configValue 配置的 value 字段
 * @returns 场景类型
 */
export function detectScenario(configValue: string): ExecuteScenario {
  try {
    // 尝试解析为 JSON
    const parsed = JSON.parse(configValue)

    // 检查是否包含 Dify 所需的两个字段
    if (parsed.AIDIFY_WORKFLOW_BASE_URL && parsed.AIDIFY_WORKFLOW_V1_API_KEY) {
      return "dify"
    }

    return "prompt"
  } catch {
    // 如果不是 JSON，则为提示词场景
    return "prompt"
  }
}

/**
 * 解析 Dify 配置
 * @param configValue 配置的 value 字段
 * @returns Dify 配置对象
 */
export function parseDifyConfig(configValue: string): DifyConfig | null {
  try {
    const parsed = JSON.parse(configValue)
    if (parsed.AIDIFY_WORKFLOW_BASE_URL && parsed.AIDIFY_WORKFLOW_V1_API_KEY) {
      return {
        AIDIFY_WORKFLOW_BASE_URL: parsed.AIDIFY_WORKFLOW_BASE_URL,
        AIDIFY_WORKFLOW_V1_API_KEY: parsed.AIDIFY_WORKFLOW_V1_API_KEY,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * 获取当前页面内容（Markdown 格式）
 * @returns Markdown 格式的页面内容
 */
export async function getPageContentAsMarkdown(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) {
        reject(new Error("无法获取当前标签页"))
        return
      }

      try {
        // 发送消息给 content script 获取页面内容
        const response = await chrome.tabs.sendMessage(tab.id, { action: "extractContent" })

        if (!response?.success) {
          reject(new Error(response?.error || "提取页面内容失败"))
          return
        }

        // 将 HTML 转换为 Markdown
        const markdown = htmlToMarkdown(response.html || response.text || "", {
          filterNoise: true,
          includeLinks: true,
          includeImages: false,
        })

        resolve(markdown)
      } catch (err: any) {
        reject(new Error(err.message || "获取页面内容失败"))
      }
    })
  })
}

/**
 * 调用提示词场景的 AI 接口
 * @param prompt 提示词
 * @param content 页面内容
 * @returns AI 返回的结果
 */
export async function executePromptScenario(
  prompt: string,
  content: string
): Promise<ExecuteResult> {
  try {
    // 获取模型配置
    const modelConfig = await getModelConfig()

    if (!modelConfig.modelBaseUrl) {
      return {
        success: false,
        error: "未配置模型服务地址，请在设置中心配置",
      }
    }

    if (!modelConfig.modelApiKey) {
      return {
        success: false,
        error: "未配置模型 API Key，请在设置中心配置",
      }
    }

    // 构建 API URL
    const apiUrl = modelConfig.modelBaseUrl.endsWith("/chat/completions")
      ? modelConfig.modelBaseUrl
      : `${modelConfig.modelBaseUrl.replace(/\/$/, "")}/chat/completions`

    // 调用 OpenAI 兼容的 API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modelConfig.modelApiKey}`,
      },
      body: JSON.stringify({
        model: modelConfig.modelName,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: content },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `AI 调用失败: ${response.status} ${errorText}`,
      }
    }

    const data = await response.json()

    // 提取返回内容
    const resultContent = data.choices?.[0]?.message?.content || data

    return {
      success: true,
      data: resultContent,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "AI 调用失败",
    }
  }
}

/**
 * 调用 Dify 文件上传接口
 * @param baseUrl Dify API 基础地址
 * @param apiKey Dify API Key
 * @param content 文件内容
 * @param filename 文件名
 * @returns 文件 ID
 */
async function uploadFileToDify(
  baseUrl: string,
  apiKey: string,
  content: string,
  filename: string = "page-content.md"
): Promise<string> {
  // 创建 Blob 对象
  const blob = new Blob([content], { type: "text/markdown" })
  const file = new File([blob], filename, { type: "text/markdown" })

  // 构建 FormData
  const formData = new FormData()
  formData.append("file", file)
  formData.append("user", "chrome-extension-user")

  // 处理 URL：如果 baseUrl 已经包含 /workflows/run，则提取基础地址
  let apiBaseUrl = baseUrl
  if (baseUrl.includes("/workflows/run")) {
    apiBaseUrl = baseUrl.replace("/workflows/run", "")
  }

  // 调用上传接口
  const uploadUrl = `${apiBaseUrl}/files/upload`

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`文件上传失败: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.id
}

/**
 * 调用 Dify 工作流运行接口
 * @param baseUrl Dify API 基础地址
 * @param apiKey Dify API Key
 * @param fileId 文件 ID
 * @returns 工作流执行结果
 */
async function runDifyWorkflow(
  baseUrl: string,
  apiKey: string,
  fileId: string
): Promise<any> {
  // 处理 URL：如果 baseUrl 已经包含 /workflows/run，则直接使用
  let workflowUrl = baseUrl
  if (!baseUrl.includes("/workflows/run")) {
    workflowUrl = `${baseUrl}/workflows/run`
  }

  const response = await fetch(workflowUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: {
        file_id: fileId,
      },
      user: "chrome-extension-user",
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`工作流执行失败: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data
}

/**
 * 执行 Dify 场景
 * @param config Dify 配置
 * @param content 页面内容
 * @returns 执行结果
 */
export async function executeDifyScenario(
  config: DifyConfig,
  content: string
): Promise<ExecuteResult> {
  try {
    // 1. 上传文件
    const fileId = await uploadFileToDify(
      config.AIDIFY_WORKFLOW_BASE_URL,
      config.AIDIFY_WORKFLOW_V1_API_KEY,
      content
    )

    // 2. 运行工作流
    const result = await runDifyWorkflow(
      config.AIDIFY_WORKFLOW_BASE_URL,
      config.AIDIFY_WORKFLOW_V1_API_KEY,
      fileId
    )

    return {
      success: true,
      data: result,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Dify 执行失败",
    }
  }
}

/**
 * 智能执行主函数
 * @param config 配置对象
 * @returns 执行结果
 */
export async function smartExecute(config: SmartExecuteConfig): Promise<ExecuteResult> {
  try {
    // 1. 获取页面内容
    const content = await getPageContentAsMarkdown()

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: "页面内容为空",
      }
    }

    // 2. 判断场景类型
    const scenario = detectScenario(config.value)

    // 3. 根据场景执行
    if (scenario === "dify") {
      const difyConfig = parseDifyConfig(config.value)
      if (!difyConfig) {
        return {
          success: false,
          error: "Dify 配置解析失败",
        }
      }
      return await executeDifyScenario(difyConfig, content)
    } else {
      // 提示词场景
      return await executePromptScenario(config.value, content)
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "执行失败",
    }
  }
}
