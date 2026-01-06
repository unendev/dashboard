'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { createLog } from '@/app/actions';
import { getBeijingTime } from '@/lib/utils';
import { CategoryCache } from '../../../lib/category-cache';
import { InstanceTagCache } from '../../../lib/instance-tag-cache';
import InstanceTagSelector from './InstanceTagSelector';

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

interface CategorySelectorProps {
  className?: string;
  onLogSaved?: () => void;
  onSelected?: (path: string, taskName: string) => void; // 新增的回调
  onAddToTimer?: (taskName: string, categoryPath: string, initialTime?: number, instanceTagNames?: string) => void; // 新增：添加到计时器的回调
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ className, onLogSaved, onSelected, onAddToTimer }) => {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [taskName, setTaskName] = useState('');
  const [duration, setDuration] = useState('');
  const [instanceTags, setInstanceTags] = useState<string[]>([]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: string, path: string, name: string} | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'top' | 'mid'>('top');
  const [createParentPath, setCreateParentPath] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // 首先尝试从缓存加载
      const cachedData = CategoryCache.getCategories();
      if (cachedData && cachedData.length > 0 && CategoryCache.isReady()) {
        console.log('使用缓存的分类数据:', cachedData);
        setCategories(cachedData);
        setIsCategoriesLoading(false);
        
        // 异步检查更新（不阻塞UI）
        checkForUpdates();
        return;
      }

      // 如果没有本地缓存，显示加载状态并从API加载
      setIsCategoriesLoading(true);
      try {
        // 并行预加载分类和事务项数据
        const [categoryData, instanceTagData] = await Promise.all([
          CategoryCache.preload(),
          InstanceTagCache.preload('user-1')
        ]);
        
        console.log('从API加载的分类数据:', categoryData);
        console.log('从API加载的事务项数据:', instanceTagData.length);
        setCategories(Array.isArray(categoryData) ? categoryData : []);
      } catch (e) {
        console.error('加载分类失败', e);
        setCategories([]);
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    // 异步检查更新的函数
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/api/log-categories');
        if (response.ok) {
          const newData = await response.json();
          const currentData = CategoryCache.getCategories();
          
          // 简单比较数据是否有变化（比较长度和第一个分类名）
          const hasChanges = !currentData || 
            currentData.length !== newData.length ||
            (currentData.length > 0 && newData.length > 0 && 
             currentData[0].name !== newData[0].name);
          
          if (hasChanges) {
            console.log('检测到分类数据更新，静默更新缓存');
            CategoryCache.updateCategories(newData);
            setCategories(newData);
          }
        }
      } catch (error) {
        console.log('检查分类更新失败（不影响用户体验）:', error);
      }
    };

    load();
  }, []);

  const handleSubCategoryClick = (topName: string, midName: string, subName?: string) => {
    // 新的两层分类体系：只使用顶级分类和子分类
    const path = subName ? `${topName}/${midName}` : `${topName}/${midName}`;
    setSelectedPath(path);
    // 默认使用子分类名作为任务名，符合重构文档的要求
    setTaskName(midName);
    setShowDialog(true);
  };

  // 时间黑洞直接创建功能 - 使用分类名作为任务名
  const handleTimeHoleCreate = async (topName: string, midName: string, subName?: string) => {
    // 新的两层分类体系：只使用顶级分类和子分类
    const path = `${topName}/${midName}`;
    const taskName = subName || midName || topName; // 使用最具体的分类名作为任务名
    
    // 直接创建时间黑洞任务，不需要用户输入
    await handleOptimisticAddToTimer(taskName, path, 0);
  };

  const handleDeleteCategory = (type: string, path: string, name: string) => {
    setDeleteTarget({ type, path, name });
    setShowDeleteConfirm(true);
  };

  const handleCreateCategory = (type: 'top' | 'mid', parentPath: string = '') => {
    setCreateType(type);
    setCreateParentPath(parentPath);
    setShowCreateDialog(true);
  };

  const confirmCreate = async () => {
    if (!newCategoryName.trim()) {
      alert('请输入分类名称');
      return;
    }

    try {
      const response = await fetch('/api/log-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: createType,
          parentPath: createParentPath,
          name: newCategoryName.trim()
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const newCategories = Array.isArray(result.categories) ? result.categories : [];
        setCategories(newCategories);
        // 更新全局缓存
        CategoryCache.updateCategories(newCategories);
        setShowCreateDialog(false);
        setNewCategoryName('');
        setCreateParentPath('');
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      alert('创建失败，请重试');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      const response = await fetch('/api/log-categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteTarget),
      });
      
      if (response.ok) {
        const result = await response.json();
        const newCategories = Array.isArray(result.categories) ? result.categories : [];
        setCategories(newCategories);
        // 更新全局缓存
        CategoryCache.updateCategories(newCategories);
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 乐观更新：立即添加到计时器，然后异步处理数据库操作
  const handleOptimisticAddToTimer = async (taskName: string, categoryPath: string, initialTime: number = 0, instanceTags?: string[]) => {
    // 立即调用回调，给用户即时反馈
    if (onAddToTimer) {
      onAddToTimer(taskName, categoryPath, initialTime, instanceTags?.join(','));
    }

    // 如果提供了选择回调，也立即调用
    if (onSelected) {
      onSelected(categoryPath, taskName);
    }

    // 重置表单
    setTaskName('');
    setDuration('');
    setInstanceTags([]);
    setShowDialog(false);
    
    // 调用保存回调
    if (onLogSaved) {
      onLogSaved();
    }

    // 后台异步处理数据库操作
    try {
      // 构建分类数据 - 新的两层分类体系
      const pathParts = categoryPath.split('/');
      const categories = [{
        name: pathParts[0] || '',
        subCategories: [{
          name: pathParts[1] || '',
          activities: [{
            name: taskName, // 直接使用任务名称
            duration: initialTime ? `${Math.floor(initialTime / 60)}m` : '0m'
          }]
        }]
      }];

      const formData = new FormData();
      formData.append('content', taskName);
      formData.append('categories', JSON.stringify(categories));
      formData.append('timestamp', getBeijingTime().toISOString());

      // 异步创建日志记录（不阻塞UI）
      createLog(formData).catch(error => {
        console.error('后台保存日志失败:', error);
        // 可以选择显示一个不显眼的错误提示
      });
    } catch (error) {
      console.error('后台处理失败:', error);
      // 不影响用户体验，只在控制台记录错误
    }
  };

  // 解析时间格式（支持 "1h20m", "45m", "2h" 等格式）并转换为秒数
  const parseTimeToSeconds = (timeStr: string): number => {
    const hours = timeStr.match(/(\d+)h/);
    const minutes = timeStr.match(/(\d+)m/);
    
    const hoursNum = hours ? parseInt(hours[1]) : 0;
    const minutesNum = minutes ? parseInt(minutes[1]) : 0;
    
    return hoursNum * 3600 + minutesNum * 60;
  };



  // 处理时间输入
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDuration(value);
  };

  // 在提交时转换时间格式 - 使用乐观更新
  const handleSubmitWithFormat = async () => {
    // 如果没有输入任务名称，使用分类路径的最后一部分作为任务名
    const finalTaskName = taskName.trim() || selectedPath.split('/').pop() || '未命名任务';

    // 解析时间输入并转换为秒数
    const initialTimeSeconds = parseTimeToSeconds(duration);

    // 使用乐观更新：立即添加到计时器，然后异步处理数据库操作
    await handleOptimisticAddToTimer(finalTaskName, selectedPath, initialTimeSeconds, instanceTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitWithFormat();
    }
  };

  // 如果正在加载分类，显示加载状态
  if (isCategoriesLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">加载分类中...</p>
        </div>
      </div>
    );
  }

  // 如果没有分类或分类不是数组，显示空状态
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm mb-4">暂无分类，请先创建分类</p>
          <Button
            onClick={() => handleCreateCategory('top')}
            variant="default"
            size="sm"
          >
            ➕ 创建顶级分类
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 分类网格布局 - 响应式设计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((topCategory, index) => (
          <Card key={`${topCategory.id}-${index}`} className="group hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-gray-200/20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm relative overflow-hidden">
            <CardHeader className="relative overflow-hidden">
              {/* 动态背景装饰 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/8 to-indigo-500/10 dark:from-blue-400/15 dark:via-purple-400/12 dark:to-indigo-400/15 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              {/* 顶部装饰线 */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardTitle className="relative text-lg font-bold text-gray-800 dark:text-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    {topCategory.name.charAt(0)}
                  </div>
                  <span className="group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">{topCategory.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full w-8 h-8 p-0 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => handleCreateCategory('mid', topCategory.name)}
                    title="添加子分类"
                  >
                    <span className="text-lg">+</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full w-8 h-8 p-0 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => handleDeleteCategory('top', '', topCategory.name)}
                    title="删除分类"
                  >
                    <span className="text-lg">×</span>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3 overflow-hidden">
              {/* 子分类按钮 - 新的两层分类体系 */}
              <div className="flex flex-wrap gap-2 overflow-x-auto">
                {topCategory.children?.map((midCategory, midIndex) => (
                  <div key={`${midCategory.id}-${midIndex}`} className="relative group flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-sm hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 hover:shadow-md hover:scale-105 transition-all duration-200 rounded-xl px-3 py-2 min-w-0 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm ${
                        topCategory.name === '🎮 休闲娱乐' ? 'pr-10' : 'pr-8'
                      }`}
                      onClick={() => handleSubCategoryClick(topCategory.name, midCategory.name)}
                    >
                      <span className="truncate font-medium text-gray-700 dark:text-gray-300">{midCategory.name}</span>
                    </Button>
                    {/* 只在休闲娱乐分类显示快捷创建按钮 */}
                    {topCategory.name === '🎮 休闲娱乐' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 active:bg-purple-100 text-sm opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-200 rounded-full w-6 h-6 p-0 z-10 touch-manipulation hover:scale-110 shadow-sm hover:shadow-md"
                        onClick={() => handleTimeHoleCreate(topCategory.name, midCategory.name)}
                        title="快速创建"
                      >
                        🕳️
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`absolute top-1/2 -translate-y-1/2 text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 text-sm opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-200 rounded-full w-6 h-6 p-0 z-10 touch-manipulation hover:scale-110 shadow-sm hover:shadow-md ${
                        topCategory.name === '🎮 休闲娱乐' ? 'right-8' : 'right-2'
                      }`}
                      onClick={() => handleDeleteCategory('mid', topCategory.name, midCategory.name)}
                      title="删除"
                    >
                      ×
                    </Button>
                  </div>
                ))}
                {/* 添加子分类按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 hover:border-green-300 dark:hover:border-green-600 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 rounded-xl px-3 py-2 hover:shadow-md hover:scale-105 transition-all duration-200 border-green-200 dark:border-green-600 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm font-medium"
                  onClick={() => handleCreateCategory('mid', topCategory.name)}
                  title="添加子分类"
                >
                  <span className="text-lg mr-1">+</span>
                  添加子分类
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 输入任务名称和时间的弹框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">⚡</span>
              </div>
              快速创建任务
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">分类路径</p>
              <p className="text-blue-600 dark:text-blue-200 font-semibold">{selectedPath}</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                任务名称 <span className="text-gray-500 font-normal">(可选，默认为分类名)</span>
              </label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="可修改任务名称，或直接使用分类名..."
                className="border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-xl dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                时间消耗 (可选)
              </label>
              <Input
                value={duration}
                onChange={handleDurationChange}
                onKeyDown={handleKeyDown}
                placeholder="如: 45m, 1h20m, 2h (为空则使用计时器)"
                className="border-gray-200 focus:border-blue-400 focus:ring-blue-400 rounded-xl dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              />
            </div>

            <InstanceTagSelector
              selectedTags={instanceTags}
              onTagsChange={setInstanceTags}
              userId="user-1"
            />
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button 
              variant="default" 
              onClick={handleSubmitWithFormat} 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl px-6"
            >
              ⏱️ 添加到计时器
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">⚠️</span>
              </div>
              确认删除
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium mb-2">即将删除</p>
              <p className="text-red-600 font-semibold">{deleteTarget?.name}</p>
              <p className="text-xs text-red-500 mt-2">
                删除后无法恢复，请谨慎操作。
              </p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-6"
            >
              🗑️ 确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建分类对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">➕</span>
              </div>
              创建新分类
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                分类名称
              </label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入分类名称..."
                className="border-gray-200 focus:border-green-400 focus:ring-green-400 rounded-xl"
                autoFocus
              />
            </div>
            {createType !== 'top' && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-700 font-medium mb-2">父级分类</p>
                <p className="text-green-600 font-semibold">{createParentPath}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button 
              variant="default" 
              onClick={confirmCreate} 
              disabled={!newCategoryName.trim()}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl px-6"
            >
              ➕ 创建分类
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategorySelector;





