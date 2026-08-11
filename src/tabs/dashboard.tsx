import { useState, useEffect } from "react"
import { BASE_URL } from "~config"

export default function Dashboard() {
  const [analysis, setAnalysis] = useState<any>(null)

  // === 登录状态 ===
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    const load = () => {
      chrome.storage?.local.get(["lastAnalysis"], (result) => {
        setAnalysis(result.lastAnalysis)
      })
    }
    load()
    const interval = setInterval(load, 2000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

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
        setUserInfo(result.data.user)
      } else {
        setIsLoggedIn(false)
      }
    } catch {
      setIsLoggedIn(false)
    } finally {
      setAuthChecking(false)
    }
  }

  const goLogin = () => {
    window.open(`${BASE_URL}/login`, "_blank")
  }

  // ===== 检测中 =====
  if (authChecking || isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-3" />
        <div className="text-sm text-gray-500">正在检测登录状态...</div>
      </div>
    )
  }

  // ===== 未登录 =====
  if (isLoggedIn === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">请先登录</h1>
        <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
          登录后即可使用工作台全部功能，包括页面智能分析、历史记录等
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={goLogin}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            ↩ 前往登录
          </button>
          <button
            onClick={checkAuth}
            className="w-full py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-medium rounded-lg transition-colors"
          >
            🔄 重新检测
          </button>
        </div>
      </div>
    )
  }

  // ===== 已登录 =====
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* 顶部欢迎 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            👋 欢迎，{userInfo?.name || userInfo?.username || "用户"}
          </h1>
          <button
            onClick={checkAuth}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="刷新登录状态"
          >
            🔄 刷新
          </button>
        </div>

        {/* 分析结果卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📝 页面智能分析</h2>

          {analysis ? (
            <>
              <p className="text-gray-600 mb-4">{analysis.summary}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {analysis.keywords?.map((k: string) => (
                  <span
                    key={k}
                    className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full font-medium"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-400 border-t pt-3">
                来源：{new URL(analysis.url).hostname} · {new Date(analysis.timestamp).toLocaleString()}
              </div>
            </>
          ) : (
            <div className="text-gray-400 py-8 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <p>在任意网页选中文本，即可触发智能分析</p>
              <p className="text-sm mt-1">分析结果将自动同步到这里</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}