'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { CategoryCache } from '@/lib/category-cache'
import { cn } from '@/lib/utils';

interface CategoryNode {
  id: string
  name: string
  children?: CategoryNode[]
}

// 【删除】 CustomCategories 接口
// interface CustomCategories {
//   [key: string]: string[]
// }

interface ThreeLayerCategorySelectorProps {
  value: string
  onChange: (path: string) => void
  className?: string
}

export function ThreeLayerCategorySelector({
  value,
  onChange,
  className = ''
}: ThreeLayerCategorySelectorProps) {
  // 分类数据状态
  const [allCategories, setAllCategories] = useState<CategoryNode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 选择状态
  const [selectedTop, setSelectedTop] = useState('')
  const [selectedMid, setSelectedMid] = useState('')
  const [selectedSub, setSelectedSub] = useState('')

  // 【删除】自定义分类状态
  // const [customCategories, setCustomCategories] = useState<CustomCategories>({})
  const [showAddTopDialog, setShowAddTopDialog] = useState(false)
  const [showAddMidDialog, setShowAddMidDialog] = useState(false)
  const [newTopName, setNewTopName] = useState('')
  const [newMidName, setNewMidName] = useState('')
  const [showAddSubDialog, setShowAddSubDialog] = useState(false)
  const [newSubName, setNewSubName] = useState('')

  // 加载分类数据
  useEffect(() => {
    const loadCategories = async () => {
      const cached = CategoryCache.getCached()
      const hasCached = cached.length > 0
      if (hasCached) {
        setAllCategories(cached)
        setIsLoading(false)
      } else {
        setIsLoading(true)
      }
      try {
        const freshData = await CategoryCache.preload()
        setAllCategories(freshData)
      } catch (error) {
        console.error('加载分类失败:', error)
        setAllCategories([])
      } finally {
        if (!hasCached) {
          setIsLoading(false)
        }
      }
    }

    loadCategories()

    // 【删除】从 localStorage 加载自定义分类的代码
    // const saved = localStorage.getItem('customCategories')
    // if (saved) {
    //   try {
    //     setCustomCategories(JSON.parse(saved))
    //   } catch (e) {
    //     console.error('加载自定义分类失败:', e)
    //   }
    // }
  }, [])

  // 【新增】保存当前选择的分类
  useEffect(() => {
    if (value) {
      localStorage.setItem('lastSelectedCategoryPath', value)
    }
  }, [value])

  // 解析路径并更新选择状态
  useEffect(() => {
    if (value && allCategories.length > 0) {
      const parts = value.split('/')
      setSelectedTop(parts[0] || '')
      setSelectedMid(parts[1] || '')
      setSelectedSub(parts[2] || '')
    }
  }, [value, allCategories])

  // 获取顶层分类
  const topCategories = (allCategories || []).map(cat => ({ name: cat.name, id: cat.id }))

  // 获取中层分类
  const getMidCategories = () => {
    const topCat = allCategories.find(cat => cat.name === selectedTop)
    return topCat?.children?.map(cat => ({ name: cat.name, id: cat.id })) || []
  }

  // 获取底层分类
  const getSubCategories = () => {
    const topCat = allCategories.find(cat => cat.name === selectedTop)
    const midCat = topCat?.children?.find(cat => cat.name === selectedMid)
    return midCat?.children?.map(cat => ({ name: cat.name, id: cat.id })) || []
  }

  const midCategories = getMidCategories()
  const subCategories = getSubCategories()

  // 构建路径字符串
  const buildPath = (top: string, mid: string, sub?: string) => {
    if (sub) return `${top}/${mid}/${sub}`
    return `${top}/${mid}`
  }

  // 选择顶层
  const handleTopSelect = (top: string) => {
    setSelectedTop(top)
    setSelectedMid('')
    setSelectedSub('')

    const firstMid = midCategories[0]
    if (firstMid) {
      setSelectedMid(firstMid.name)
      onChange(buildPath(top, firstMid.name))
    }
  }

  // 选择中层
  const handleMidSelect = (mid: string) => {
    setSelectedMid(mid)
    setSelectedSub('')

    const firstSub = subCategories[0]
    if (firstSub) {
      setSelectedSub(firstSub.name)
      onChange(buildPath(selectedTop, mid, firstSub.name))
    } else {
      onChange(buildPath(selectedTop, mid))
    }
  }

  // 选择底层
  const handleSubSelect = (sub: string) => {
    setSelectedSub(sub)
    onChange(buildPath(selectedTop, selectedMid, sub))
  }

  // 添加顶层
  const addTopCategory = async () => {
    if (!newTopName.trim()) return
    if (topCategories.find(cat => cat.name === newTopName.trim())) {
      alert('该分类已存在')
      return
    }

    try {
      const response = await fetch('/api/log-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'top', name: newTopName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建失败');
      }

      // 重新加载所有分类数据
      alert('顶层分类创建成功');
      setIsLoading(true);
      const freshData = await CategoryCache.preload({ forceRefresh: true });
      setAllCategories(freshData);
      setIsLoading(false);

      // 保持当前选择，但清空新增输入框
      setNewTopName('');
      setShowAddTopDialog(false);
    } catch (error: unknown) {
      alert(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 添加中层
  const addMidCategory = async () => {
    if (!selectedTop || !newMidName.trim()) return
    if (midCategories.find(cat => cat.name === newMidName.trim())) {
      alert('该分类已存在')
      return
    }

    try {
      const response = await fetch('/api/log-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mid', parentPath: selectedTop, name: newMidName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建失败');
      }

      // 重新加载所有分类数据
      alert('中层分类创建成功');
      setIsLoading(true);
      const freshData = await CategoryCache.preload({ forceRefresh: true });
      setAllCategories(freshData);
      setIsLoading(false);

      // 保持当前选择，但清空新增输入框
      setNewMidName('');
      setShowAddMidDialog(false);
    } catch (error: unknown) {
      alert(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 添加底层
  const addSubCategory = async () => {
    if (!selectedMid || !newSubName.trim()) return
    if (subCategories.find(cat => cat.name === newSubName.trim())) {
      alert('该分类已存在')
      return
    }

    try {
      const response = await fetch('/api/log-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sub', parentPath: `${selectedTop}/${selectedMid}`, name: newSubName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建失败');
      }

      // 重新加载所有分类数据
      alert('底层分类创建成功');
      setIsLoading(true);
      const freshData = await CategoryCache.preload({ forceRefresh: true });
      setAllCategories(freshData);
      setIsLoading(false);

      // 保持当前选择，但清空新增输入框
      setNewSubName('');
      setShowAddSubDialog(false);
    } catch (error: unknown) {
      alert(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 删除分类
  const deleteCategory = async (type: 'top' | 'mid' | 'sub', name: string) => {
    if (!confirm(`确定删除分类 "${name}" 吗？这也会删除其所有子分类。`)) return;

    let path = '';
    if (type === 'mid') path = selectedTop;
    if (type === 'sub') path = `${selectedTop}/${selectedMid}`;

    try {
      const response = await fetch('/api/log-categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, path, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除失败');
      }

      // 重新加载所有分类数据
      alert('分类已成功删除');
      setIsLoading(true);
      const freshData = await CategoryCache.preload();
      setAllCategories(freshData);
      setIsLoading(false);

      // 清理选择
      if (type === 'top') {
        setSelectedTop('');
        setSelectedMid('');
        setSelectedSub('');
      } else if (type === 'mid') {
        setSelectedMid('');
        setSelectedSub('');
      } else if (type === 'sub') {
        setSelectedSub('');
      }
      onChange(''); // 清空父组件的选中路径
    } catch (error: unknown) {
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">加载分类中...</div>
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 当前选择显示 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          分类路径
        </label>
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-base text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
            <span>{selectedTop || '未选择'}</span>
            {selectedMid && (
              <>
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                <span>{selectedMid}</span>
              </>
            )}
            {selectedSub && (
              <>
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                <span>{selectedSub}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 三列并排布局 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 顶层分类 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              顶层分类
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAddTopDialog(true)}
              className="h-6 px-2 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              新增
            </Button>
          </div>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {topCategories.map((cat) => (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={(e) => {
                  const btn = e.currentTarget.querySelector('[data-delete-btn]')
                  if (btn) btn.classList.remove('hidden')
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget.querySelector('[data-delete-btn]')
                  if (btn) btn.classList.add('hidden')
                }}
              >
                <button
                  onClick={() => handleTopSelect(cat.name)}
                  className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all text-left ${selectedTop === cat.name
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {cat.name}
                </button>
                <button
                  onClick={() => deleteCategory('top', cat.name)}
                  data-delete-btn
                  className={cn(
                    "absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-lg",
                    selectedTop !== cat.name && "hidden" // 默认隐藏，只有选中时才显示
                  )}
                  title="删除此分类"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* 新增顶层对话框 */}
          {showAddTopDialog && (
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
              <div className="flex gap-2">
                <Input
                  value={newTopName}
                  onChange={(e) => setNewTopName(e.target.value)}
                  placeholder="输入新分类名..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTopCategory()
                    if (e.key === 'Escape') setShowAddTopDialog(false)
                  }}
                  autoFocus
                  className="text-sm"
                />
                <Button size="sm" onClick={addTopCategory} className="bg-blue-600 hover:bg-blue-700 text-white px-3">
                  确定
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddTopDialog(false)} className="px-3">
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 中层分类 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
              中层分类
            </div>
            {selectedTop && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowAddMidDialog(true)}
                className="h-6 px-2 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                新增
              </Button>
            )}
          </div>
          {selectedTop ? (
            <>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {midCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="relative"
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget.querySelector('[data-delete-btn]')
                      if (btn) btn.classList.remove('hidden')
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget.querySelector('[data-delete-btn]')
                      if (btn) btn.classList.add('hidden')
                    }}
                  >
                    <button
                      onClick={() => handleMidSelect(cat.name)}
                      className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all text-left ${selectedMid === cat.name
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      {cat.name}
                    </button>
                    <button
                      onClick={() => deleteCategory('mid', cat.name)}
                      data-delete-btn
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-lg hidden"
                      title="删除此分类"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 新增中层对话框 */}
              {showAddMidDialog && (
                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="flex gap-2">
                    <Input
                      value={newMidName}
                      onChange={(e) => setNewMidName(e.target.value)}
                      placeholder="输入新分类名..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addMidCategory()
                        if (e.key === 'Escape') setShowAddMidDialog(false)
                      }}
                      autoFocus
                      className="text-sm"
                    />
                    <Button size="sm" onClick={addMidCategory} className="bg-blue-600 hover:bg-blue-700 text-white px-3">
                      确定
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddMidDialog(false)} className="px-3">
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
              请先选择顶层分类
            </div>
          )}
        </div>

        {/* 底层分类 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
              底层分类
            </div>
            {selectedMid && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowAddSubDialog(true)}
                className="h-6 px-2 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                新增
              </Button>
            )}
          </div>
          {selectedMid ? (
            <>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {subCategories.map((sub) => (
                  <div
                    key={sub.name}
                    className="relative"
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget.querySelector('[data-delete-btn]')
                      if (btn) btn.classList.remove('hidden')
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget.querySelector('[data-delete-btn]')
                      if (btn) btn.classList.add('hidden')
                    }}
                  >
                    <button
                      onClick={() => handleSubSelect(sub.name)}
                      className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all text-left ${selectedSub === sub.name
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      {sub.name}
                    </button>
                    <button
                      onClick={() => deleteCategory('sub', sub.name)}
                      data-delete-btn
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all shadow-lg hidden"
                      title="删除此分类"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 新增底层对话框 */}
              {showAddSubDialog && (
                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="flex gap-2">
                    <Input
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="输入新分类名..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addSubCategory()
                        if (e.key === 'Escape') setShowAddSubDialog(false)
                      }}
                      autoFocus
                      className="text-sm"
                    />
                    <Button size="sm" onClick={addSubCategory} className="bg-blue-600 hover:bg-blue-700 text-white px-3">
                      确定
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddSubDialog(false)} className="px-3">
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
              请先选择中层分类
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
