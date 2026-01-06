'use client'

import { ArticleEditor } from '@/app/components/features/articles/ArticleEditor'
import { useDevSession } from '@/app/hooks/useDevSession'

export default function NewArticlePage() {
  // 使用开发会话，支持自动登录示例账户
  const { data: session, status } = useDevSession()

  return <ArticleEditor />
}








