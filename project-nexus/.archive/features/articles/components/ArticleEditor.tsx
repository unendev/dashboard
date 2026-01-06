'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TipTapEditor } from './TipTapEditor'

interface ArticleEditorProps {
  articleId?: string
}

export function ArticleEditor({ articleId }: ArticleEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [abstract, setAbstract] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')
  const [showPreview, setShowPreview] = useState(false)
  const [useRichEditor, setUseRichEditor] = useState(true) // 默认使用所见即所得
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(!!articleId)

  const fetchArticle = useCallback(async () => {
    try {
      const response = await fetch(`/api/articles/${articleId}`)
      if (response.ok) {
        const data = await response.json()
        setTitle(data.title)
        setSubtitle(data.subtitle || '')
        setContent(data.content)
        setAbstract(data.abstract || '')
        setTags(data.tags || [])
        setSlug(data.slug)
        setStatus(data.status)
      }
    } catch (error) {
      console.error('获取文章失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    if (articleId) {
      fetchArticle()
    }
  }, [articleId, fetchArticle])

  const handleSave = async (publishNow = false) => {
    if (!title || !content || !slug) {
      alert('标题、内容和URL标识不能为空')
      return
    }

    setIsSaving(true)
    try {
      const data = {
        title,
        subtitle,
        content,
        abstract,
        tags,
        slug,
        status: publishNow ? 'PUBLISHED' : status
      }

      const url = articleId ? `/api/articles/${articleId}` : '/api/articles'
      const method = articleId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        await response.json()
        alert(publishNow ? '文章已发布！' : '保存成功！')
        router.push('/treasure-pavilion/articles')
      } else {
        const error = await response.json()
        alert(`保存失败: ${error.error}`)
      }
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setUseRichEditor(!useRichEditor)}
                className="text-white/60 hover:text-white text-xs"
              >
                {useRichEditor ? 'Markdown' : '所见即所得'}
              </Button>
              
              {!useRichEditor && (
                <Button
                  variant="ghost"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-white/60 hover:text-white"
                >
                  {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showPreview ? '编辑' : '预览'}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Save className="w-4 h-4 mr-2" />
                保存草稿
              </Button>

              <Button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="bg-blue-500 hover:bg-blue-600"
              >
                发布专题
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主编辑区 */}
          <div className="lg:col-span-2">
            {/* 标题输入区 */}
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="专题标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-4xl font-bold text-white outline-none border-b border-white/10 pb-2 placeholder-white/30"
              />

              <input
                type="text"
                placeholder="副标题（可选）"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-transparent text-xl text-white/70 outline-none border-b border-white/10 pb-2 placeholder-white/30"
              />
            </div>

            {/* 编辑器切换 */}
            {useRichEditor ? (
              /* 所见即所得编辑器 */
              <TipTapEditor
                content={content}
                onChange={setContent}
                placeholder="开始撰写你的专题内容..."
              />
            ) : showPreview ? (
              /* Markdown 预览模式 */
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || '*暂无内容*'}
                </ReactMarkdown>
              </div>
            ) : (
              /* Markdown 编辑模式 */
              <textarea
                placeholder="在这里用 Markdown 撰写你的专题内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[600px] bg-white/5 border border-white/10 rounded-lg p-4 text-white outline-none focus:border-blue-500/50 resize-none font-mono text-sm"
              />
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <label className="block text-sm text-white/60 mb-2">摘要</label>
              <textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-white outline-none focus:border-blue-500/50"
                rows={3}
                placeholder="简短描述文章内容..."
              />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <label className="block text-sm text-white/60 mb-2">标签</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-sm text-white outline-none focus:border-blue-500/50"
                  placeholder="输入标签..."
                />
                <Button size="sm" onClick={addTag}>添加</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    onClick={() => removeTag(tag)}
                    className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full cursor-pointer hover:bg-purple-500/30"
                  >
                    #{tag} ×
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <label className="block text-sm text-white/60 mb-2">URL 标识</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-white outline-none focus:border-blue-500/50"
                placeholder="my-article-slug"
              />
              <p className="text-xs text-white/40 mt-1">
                只能包含小写字母、数字和连字符
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-white/60">
                <div className="flex justify-between mb-2">
                  <span>字数</span>
                  <span className="text-white">{content.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>预计阅读</span>
                  <span className="text-white">{Math.ceil(content.length / 400)} 分钟</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

