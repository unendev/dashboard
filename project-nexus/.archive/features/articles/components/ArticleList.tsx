'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, FileText, Clock } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  subtitle?: string
  abstract?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  wordCount: number
  readingTime: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
  tags: string[]
  _count?: {
    treasureRefs: number
  }
}

export function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // 组件挂载状态追踪
  const isMountedRef = useRef(true)
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const abortController = new AbortController()
    
    const fetchArticles = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams()
        if (statusFilter !== 'all') {
          params.append('status', statusFilter)
        }
        
        const response = await fetch(`/api/articles?${params.toString()}`, {
          signal: abortController.signal
        })
        
        if (!isMountedRef.current) return
        
        if (response.ok) {
          const data = await response.json()
          
          if (!isMountedRef.current) return
          
          setArticles(data)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('请求已取消')
          return
        }
        if (isMountedRef.current) {
          console.error('获取文章列表失败:', error)
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }
    
    fetchArticles()
    
    return () => abortController.abort()
  }, [statusFilter])

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      PUBLISHED: 'bg-green-500/20 text-green-300 border-green-500/50',
      ARCHIVED: 'bg-gray-500/20 text-gray-300 border-gray-500/50'
    }
    const labels = {
      DRAFT: '草稿',
      PUBLISHED: '已发布',
      ARCHIVED: '已归档'
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">专题文章</h1>
          <p className="text-white/60">更专业的写作工具，系统化的知识整理</p>
        </div>
        
        <Link href="/treasure-pavilion/articles/new">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            撰写专题
          </Button>
        </Link>
      </div>

      {/* 筛选器 */}
      <div className="flex gap-2 mb-6">
        {['all', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              statusFilter === status
                ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
            }`}
          >
            {status === 'all' ? '全部' : status === 'DRAFT' ? '草稿' : status === 'PUBLISHED' ? '已发布' : '已归档'}
          </button>
        ))}
      </div>

      {/* 文章列表 */}
      {isLoading ? (
        <div className="text-center py-12 text-white/60">加载中...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-white/40 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">还没有专题文章</h3>
          <p className="text-white/60 mb-4">开始撰写你的第一篇专业文章</p>
          <Link href="/treasure-pavilion/articles/new">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              创建专题
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(article => (
            <Link 
              key={article.id}
              href={`/treasure-pavilion/articles/${article.id}/edit`}
              className="block group"
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all">
                {/* 状态标签 */}
                <div className="flex items-center justify-between mb-3">
                  {getStatusBadge(article.status)}
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readingTime}分钟
                    </span>
                    <span>{article.wordCount}字</span>
                  </div>
                </div>

                {/* 标题 */}
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                  {article.title}
                </h3>

                {/* 副标题 */}
                {article.subtitle && (
                  <p className="text-sm text-white/60 mb-3 line-clamp-1">
                    {article.subtitle}
                  </p>
                )}

                {/* 摘要 */}
                {article.abstract && (
                  <p className="text-sm text-white/50 mb-4 line-clamp-2">
                    {article.abstract}
                  </p>
                )}

                {/* 标签 */}
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {article.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
                        #{tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="text-xs text-white/40">
                        +{article.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* 底部信息 */}
                <div className="flex items-center justify-between text-xs text-white/40 pt-4 border-t border-white/10">
                  <span>
                    {new Date(article.updatedAt).toLocaleDateString('zh-CN')}
                  </span>
                  {article._count && article._count.treasureRefs > 0 && (
                    <span>引用 {article._count.treasureRefs} 个宝藏</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}











