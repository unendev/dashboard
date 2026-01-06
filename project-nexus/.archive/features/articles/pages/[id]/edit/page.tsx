'use client'

import { ArticleEditor } from '@/app/components/features/articles/ArticleEditor'
import { useDevSession } from '@/app/hooks/useDevSession'
import { use } from 'react'

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  // 使用开发会话，支持自动登录示例账户
  const { data: session, status } = useDevSession()
  const { id } = use(params)
  
  return <ArticleEditor articleId={id} />
}








