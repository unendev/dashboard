'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { InstanceTagCache } from '@/lib/instance-tag-cache';

interface InstanceTag {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface InstanceTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  userId?: string;
  className?: string;
}

const InstanceTagSelector: React.FC<InstanceTagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  userId = 'user-1',
  className = ''
}) => {
  const [availableTags, setAvailableTags] = useState<InstanceTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载可用的事务项
  useEffect(() => {
    const loadInstanceTags = async () => {
      setIsLoading(true);
      try {
        // 首先尝试从缓存加载
        const cachedData = InstanceTagCache.loadFromStorage();
        if (cachedData && cachedData.length > 0) {
          console.log('使用本地缓存的事务项数据:', cachedData.length);
          setAvailableTags(cachedData);
          setIsLoading(false);
          
          // 异步检查更新（不阻塞UI）
          checkForUpdates();
          return;
        }

        // 并行加载：预定义事务项 + 已使用过的事务项
        const [predefinedTags, usedTagsResponse] = await Promise.all([
          InstanceTagCache.preload(userId),
          fetch(`/api/timer-tasks/instance-tags?userId=${userId}`)
        ]);

        // 确保 predefinedTags 是数组
        const safePredefinedTags = Array.isArray(predefinedTags) ? predefinedTags : [];

        let usedTags: InstanceTag[] = [];
        if (usedTagsResponse.ok) {
          const usedTagsData = await usedTagsResponse.json();
          // 将使用过的事务项转换为标准格式
          usedTags = (usedTagsData.instanceTags || []).map((tagName: string) => ({
            id: `used-${tagName}`,
            name: tagName,
            userId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
        }

        // 合并并去重事务项
        const allTagsMap = new Map<string, InstanceTag>();
        
        // 添加预定义的事务项
        safePredefinedTags.forEach(tag => {
          allTagsMap.set(tag.name, tag);
        });
        
        // 添加已使用过的事务项（不覆盖预定义的）
        usedTags.forEach(tag => {
          if (!allTagsMap.has(tag.name)) {
            allTagsMap.set(tag.name, tag);
          }
        });

        const mergedTags = Array.from(allTagsMap.values());
        console.log(`加载事务项完成: 预定义${safePredefinedTags.length}个, 已使用${usedTags.length}个, 合并后${mergedTags.length}个`);
        
        setAvailableTags(mergedTags);
        
        // 更新缓存
        if (mergedTags.length > 0) {
          InstanceTagCache.updateInstanceTags(mergedTags);
        }
        
      } catch (error) {
        console.error('加载事务项失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 异步检查更新的函数
    const checkForUpdates = async () => {
      try {
        // 并行检查两个数据源的更新
        const [predefinedResponse, usedTagsResponse] = await Promise.all([
          fetch(`/api/instance-tags?userId=${userId}`),
          fetch(`/api/timer-tasks/instance-tags?userId=${userId}`)
        ]);

        let hasChanges = false;
        const currentData = InstanceTagCache.getInstanceTags();
        
        if (predefinedResponse.ok && usedTagsResponse.ok) {
          const predefinedData = await predefinedResponse.json();
          const usedTagsData = await usedTagsResponse.json();
          
          // 构建新的合并数据
          const allTagsMap = new Map<string, InstanceTag>();
          
          // 添加预定义的事务项
          (predefinedData || []).forEach((tag: InstanceTag) => {
            allTagsMap.set(tag.name, tag);
          });
          
          // 添加已使用过的事务项
          (usedTagsData.instanceTags || []).forEach((tagName: string) => {
            if (!allTagsMap.has(tagName)) {
              allTagsMap.set(tagName, {
                id: `used-${tagName}`,
                name: tagName,
                userId: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          });

          const mergedData = Array.from(allTagsMap.values());
          
          // 检查是否有变化
          hasChanges = !currentData || 
            mergedData.length !== currentData.length ||
            mergedData.some(newTag => 
              !currentData.find(currentTag => currentTag.name === newTag.name)
            );
          
          if (hasChanges) {
            console.log('检测到事务项更新，静默更新缓存');
            InstanceTagCache.updateInstanceTags(mergedData);
            setAvailableTags(mergedData);
          }
        }
      } catch (error) {
        console.log('检查事务项更新失败（不影响用户体验）:', error);
      }
    };

    loadInstanceTags();
  }, [userId]);

  // 创建新的事务项
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      alert('请输入事务项名称');
      return;
    }

    // 确保以#开头
    const tagName = newTagName.trim().startsWith('#') ? newTagName.trim() : `#${newTagName.trim()}`;

    setIsCreating(true);
    try {
      const response = await fetch('/api/instance-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagName,
          userId: userId
        }),
      });

      if (response.ok) {
        const newTag = await response.json();
        setAvailableTags(prev => [...prev, newTag]);
        
        // 更新缓存
        InstanceTagCache.addInstanceTag(newTag);
        
        setNewTagName('');
        setShowCreateDialog(false);
        
        // 自动选择新创建的事务项
        onTagsChange([...selectedTags, tagName]);
      } else {
        const errorData = await response.json();
        if (response.status === 409) {
          alert('该事务项已存在');
        } else {
          alert(`创建失败: ${errorData.error || '未知错误'}`);
        }
      }
    } catch (error) {
      console.error('创建事务项失败:', error);
      alert('创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  // 切换事务项选择状态
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  // 删除事务项（同时删除任务记录中的引用）
  const handleDeleteTag = async (tagId: string, tagName: string) => {
    // 检查是否是从任务记录中提取的事务项
    const isFromTasks = tagId.startsWith('used-');
    
    const confirmMessage = isFromTasks
      ? `"${tagName}" 来自历史任务记录，删除后将清空所有任务中的此事务项标记。确定删除？`
      : `确定要删除事务项 "${tagName}" 吗？这将同时清空所有任务中的此标记。`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // 只有预定义的事务项才需要调用删除API
      if (!isFromTasks) {
        const response = await fetch(`/api/instance-tags/${tagId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          alert('删除失败，请重试');
          return;
        }
      }

      // 清除所有任务中的此事务项引用
      try {
        await fetch(`/api/timer-tasks/clear-instance-tag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagName, userId })
        });
      } catch (error) {
        console.error('清除任务引用失败:', error);
      }

      // 更新本地状态
      setAvailableTags(prev => prev.filter(tag => tag.id !== tagId));
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
      
      alert('删除成功');
    } catch (error) {
      console.error('删除事务项失败:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 标签选择区域 */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          事务项 (可选)
        </label>
        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          {selectedTags.length === 0 ? (
            <span className="text-gray-400 text-sm">点击下方按钮选择事务项</span>
          ) : (
            selectedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
              >
                {tag.replace(/^#/, '')}
                <button
                  onClick={() => toggleTag(tag)}
                  className="text-blue-500 hover:text-blue-700 ml-1"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 可用事务项列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700">事务项</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="text-xs"
          >
            + 新建
          </Button>
        </div>

        {/* 搜索框 */}
        <Input
          type="text"
          placeholder="搜索事务项..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />
        
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 text-sm mt-2">加载中...</p>
          </div>
        ) : (
          <>
            {(() => {
              // 筛选事务项
              const filteredTags = availableTags.filter(tag =>
                tag.name.toLowerCase().includes(searchQuery.toLowerCase())
              );

              return (
                <>
                  <div className="text-xs text-gray-500">
                    {searchQuery ? `找到 ${filteredTags.length} 个` : `共 ${availableTags.length} 个`}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                    {filteredTags.length === 0 ? (
                      <div className="w-full text-center py-4 text-sm text-gray-400">
                        {searchQuery ? '未找到匹配的事务项' : '暂无事务项'}
                      </div>
                    ) : (
                      filteredTags.map(tag => {
                        const isFromTasks = tag.id.startsWith('used-');
                        const isSelected = selectedTags.includes(tag.name);
                        const displayName = tag.name.replace(/^#/, '');
                        
                        return (
                          <div key={tag.id} className="relative group">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleTag(tag.name)}
                              className={`text-xs h-7 pr-6 ${
                                isSelected
                                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                              }`}
                              title={isFromTasks ? '来自历史记录' : '预定义'}
                            >
                              {displayName}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-7 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag.id, tag.name);
                              }}
                              title="删除"
                            >
                              ×
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* 创建新事务项对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>创建新事务项</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="如: 个人门户, 修Bug, 论文写作..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTagName.trim() && !isCreating) {
                  handleCreateTag();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              系统会自动添加 # 前缀
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
            >
              取消
            </Button>
            <Button 
              onClick={handleCreateTag} 
              disabled={!newTagName.trim() || isCreating}
            >
              {isCreating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstanceTagSelector;



