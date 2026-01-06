'use client'

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { clearManualLogout } from "@/app/hooks/useDevSession"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  // 确保示例账号存在
  useEffect(() => {
    fetch('/api/auth/ensure-demo-user', { method: 'POST' })
      .catch(err => console.error('确保示例账号失败:', err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    console.log("Login initiated, callbackUrl:", callbackUrl); // 添加日志

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("邮箱或密码错误")
      } else {
        // 登录成功，清除手动登出标记，重定向到 callbackUrl
        clearManualLogout()
        router.push(callbackUrl)
      }
    } catch {
      setError("登录失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsDemoLoading(true)
    setError("")

    console.log("Demo login initiated, callbackUrl:", callbackUrl); // 添加日志

    try {
      // 获取示例账号信息
      const demoResponse = await fetch('/api/auth/ensure-demo-user')
      const demoData = await demoResponse.json()
      
      const result = await signIn("credentials", {
        email: demoData.email,
        password: demoData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("示例账号登录失败")
      } else {
        // 登录成功，清除手动登出标记，重定向到 callbackUrl
        clearManualLogout()
        router.push(callbackUrl)
      }
    } catch {
      setError("示例账号登录失败，请重试")
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到个人门户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            请输入您的邮箱和密码
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                邮箱地址
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "登录中..." : "登录"}
            </button>
          </div>

        </form>

        {/* 示例账号快速登录 */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">或</span>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isDemoLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDemoLoading ? "登录中..." : "使用示例账号登录"}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              示例账号: demo@example.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

