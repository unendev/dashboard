'use client'

import { useState, useEffect } from 'react'
import { FloatingActionButton } from '../../shared/FloatingActionButton'
import { TreasureInputModal, TreasureData } from './treasure-input'
import { TreasureStatsPanel } from './TreasureStatsPanel'
import { TreasureOutline } from './TreasureOutline'

// New Sub-components
import { TreasureFilterBar } from './list/TreasureFilterBar'
import { TreasureCardWrapper } from './list/TreasureCardWrapper'

// Hooks
import { useTreasureList, Treasure } from '@/app/hooks/treasure/use-treasure-list'

interface TreasureListProps {
  className?: string
}

export function TreasureList({ className }: TreasureListProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTreasure, setEditingTreasure] = useState<Treasure | null>(null)

  // Persistent State for Tags
  const [lastTags, setLastTags] = useState<string[]>([])
  const [recentTags, setRecentTags] = useState<string[]>([])

  const {
    treasures, setTreasures,
    searchQuery, setSearchQuery,
    isSearching,
    selectedTag, setSelectedTag,
    isLoadingMore,
    hasMore,
    statsData, setStatsData,
    activeId,
    treasureRefsMap,
    fetchTreasures,
    fetchStatsData,
    scrollToTreasure
  } = useTreasureList();

  useEffect(() => {
    setIsMounted(true)
    const storedRecentTags = localStorage.getItem('recentTreasureTags')
    if (storedRecentTags) {
      try {
        const parsed = JSON.parse(storedRecentTags);
        // Filter out legacy tags
        const filtered = Array.isArray(parsed)
          ? parsed.filter((t: string) => !['Life', 'Thought', 'Knowledge', 'Root'].includes(t.replace(/^#/, '')))
          : [];
        setRecentTags(filtered);
      } catch (e) { console.error(e); }
    }
    fetchStatsData()
  }, [fetchStatsData])

  useEffect(() => {
    if (treasures.length > 0) setLastTags(treasures[0].tags)
    else setLastTags([])
  }, [treasures])

  // Handlers
  const handleCreateTreasure = async (data: TreasureData) => {
    try {
      const { skipAiTagging, ...payload } = data
      console.info('[Treasure Create] start', {
        tagsCount: payload.tags?.length ?? 0,
        skipAiTagging: !!skipAiTagging
      })
      const response = await fetch('/api/treasures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        const newTreasure = await response.json()
        console.info('[Treasure Create] success', { id: newTreasure.id })

        // Optimistic update: Close modal and refresh list immediately
        await fetchTreasures(true)
        setShowCreateModal(false)
        setStatsData(prev => [{ id: newTreasure.id, createdAt: newTreasure.createdAt, tags: newTreasure.tags }, ...prev])
        setRecentTags(prevTags => {
          const legacyTags = ['Life', 'Thought', 'Knowledge', 'Root'];
          const updatedTags = Array.from(new Set([...newTreasure.tags, ...prevTags]))
            .filter(t => !legacyTags.includes(t.replace(/^#/, '')))
            .slice(0, 20)
          localStorage.setItem('recentTreasureTags', JSON.stringify(updatedTags))
          return updatedTags
        })

        if (!skipAiTagging) {
          // Background AI Tagging
          (async () => {
            try {
              console.info('[AI Tagging] trigger', { treasureId: newTreasure.id })
              const aiResponse = await fetch(`/api/treasures/${newTreasure.id}/ai-tag`, { method: 'POST' })
              if (!aiResponse.ok) {
                const errorText = await aiResponse.text()
                console.error('[AI Tagging] failed', {
                  treasureId: newTreasure.id,
                  status: aiResponse.status,
                  error: errorText
                })
              } else {
                const aiResult = await aiResponse.json().catch(() => null)
                console.info('[AI Tagging] completed', {
                  treasureId: newTreasure.id,
                  tagsCount: Array.isArray(aiResult?.tags) ? aiResult.tags.length : 0,
                  fallback: !!aiResult?.fallback
                })
                // Optional: refresh purely for tags if needed, but usually user moves on.
                // If we want to show tags appearing magically, we might need to re-fetch or use a socket/polling.
                // For now, "non-blocking" is the goal.
              }
            } catch (error) {
              console.error('[AI Tagging] error', { treasureId: newTreasure.id, error })
            }
          })()
        }
      } else {
        const errorText = await response.text()
        console.error('[Treasure Create] failed', { status: response.status, error: errorText })
      }
    } catch (error) { console.error(error); }
  }

  const handleDeleteTreasure = async (id: string) => {
    if (!confirm('确定要删除这个宝藏吗？')) return
    try {
      const response = await fetch(`/api/treasures/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchTreasures(true)
        setStatsData(prev => prev.filter(item => item.id !== id))
      }
    } catch (error) { console.error(error); }
  }

  const handleEditTreasure = async (data: TreasureData) => {
    if (!editingTreasure) return
    try {
      const { skipAiTagging, ...payload } = data
      const response = await fetch(`/api/treasures/${editingTreasure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        const updatedTreasure = await response.json()
        // 本地更新，避免全量重刷
        setTreasures(prev => prev.map(t => t.id === editingTreasure.id ? updatedTreasure : t))
        setStatsData(prev => prev.map(item => item.id === editingTreasure.id ? {
          ...item,
          createdAt: updatedTreasure.createdAt,
          tags: updatedTreasure.tags,
          theme: updatedTreasure.theme
        } : item))
        setShowEditModal(false)
        setEditingTreasure(null)
        setRecentTags(prevTags => {
          const updatedTags = Array.from(new Set([...updatedTreasure.tags, ...prevTags])).slice(0, 20)
          localStorage.setItem('recentTreasureTags', JSON.stringify(updatedTags))
          return updatedTags
        })
      }
    } catch (error) { console.error(error); }
  }

  if (!isMounted) return null

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-[288px_1fr_320px] gap-4 xl:gap-6 w-full mx-auto px-2 xl:px-4 pb-8 pt-4 ${className}`}>
      {/* Sidebar: Outline */}
      <aside className="hidden xl:block self-start">
        <div className="bg-[#1e293b] rounded-xl border border-white/10">
          <TreasureOutline
            treasures={treasures.map(t => ({ id: t.id, title: t.title, type: t.type, createdAt: t.createdAt }))}
            selectedId={activeId}
            onTreasureClick={scrollToTreasure}
          />
        </div>
      </aside>

      {/* Main Content: Feed */}
      <div className="flex flex-col min-w-0 max-w-2xl mx-auto w-full pb-20">
        <TreasureFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearching={isSearching}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
        />

        {treasures.length === 0 ? (
          <EmptyState isFiltered={!!(searchQuery || selectedTag)} />
        ) : (
          <div className="px-2 xl:px-4 space-y-4">
            {treasures.map((treasure) => (
              <div
                key={treasure.id}
                data-treasure-id={treasure.id}
                ref={(el) => { if (el) treasureRefsMap.current.set(treasure.id, el); }}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' } as React.CSSProperties}
                className="will-change-transform"
              >
                <TreasureCardWrapper
                  treasure={treasure}
                  onEdit={(id) => {
                    const t = treasures.find(item => item.id === id);
                    if (t) { setEditingTreasure(t); setShowEditModal(true); }
                  }}
                  onDelete={handleDeleteTreasure}
                />
              </div>
            ))}

            {isLoadingMore && <LoadingIndicator />}
            {!hasMore && treasures.length > 0 && <EndOfList />}
          </div>
        )}
      </div>

      {/* Sidebar: Stats */}
      <aside className="hidden xl:block self-start">
        <TreasureStatsPanel
          treasures={statsData}
          onTagClick={setSelectedTag}
          selectedTag={selectedTag}
        />
      </aside>

      <FloatingActionButton onCreateTreasure={() => setShowCreateModal(true)} />

      <TreasureInputModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTreasure}
        lastTags={lastTags}
        recentTags={recentTags}
      />

      {editingTreasure && (
        <TreasureInputModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingTreasure(null); }}
          onSubmit={handleEditTreasure}
          mode="edit"
          initialData={{ ...editingTreasure, content: editingTreasure.content ?? '' }}
          recentTags={recentTags}
        />
      )}
    </div>
  )
}

// Internal Helper Components
function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="text-white/40 mb-4 text-6xl">💎</div>
      <h3 className="text-lg font-medium text-white mb-2">
        {isFiltered ? '没有找到匹配的宝藏' : '还没有宝藏'}
      </h3>
      <p className="text-white/60 mb-4">
        {isFiltered ? '尝试调整搜索条件' : '点击右下角按钮创建你的第一个宝藏'}
      </p>
    </div>
  )
}

function LoadingIndicator() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="flex items-center gap-2 text-white/60">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span className="text-sm">加载中...</span>
      </div>
    </div>
  )
}

function EndOfList() {
  return (
    <div className="flex justify-center items-center py-8 pb-20">
      <span className="text-sm text-white/40">没有更多内容了</span>
    </div>
  )
}
