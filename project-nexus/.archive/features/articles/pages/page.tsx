'use client'

import { ArticleWorkspace } from '@/app/components/features/articles/ArticleWorkspace'
import { useDevSession } from '@/app/hooks/useDevSession'

export default function ArticlesPage() {
  // 使用开发会话，支持自动登录示例账户
  const { data: session, status } = useDevSession()

  return (
    <div className="h-screen overflow-hidden">
      <ArticleWorkspace />
    </div>
  )
}
