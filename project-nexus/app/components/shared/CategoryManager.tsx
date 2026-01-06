'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { createLog } from '@/app/actions';
import { getBeijingTime } from '@/lib/utils';

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

interface CategoryManagerProps {
  className?: string;
  onLogSaved?: () => void;
  onSelected?: (path: string, taskName: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ className, onLogSaved, onSelected }) => {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [taskName, setTaskName] = useState('');
  const [duration, setDuration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: string, path: string, name: string} | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'top' | 'mid' | 'sub'>('top');
  const [createParentPath, setCreateParentPath] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/log-categories');
        const data = await res.json();
        setCategories(data as CategoryNode[]);
      } catch (e) {
        console.error('加载分类失败', e);
      }
    };
    load();
  }, []);

  const handleSubCategoryClick = (topName: string, midName: string, subName: string) => {
    const path = `${topName}/${midName}/${subName}`;
    setSelectedPath(path);
    // 任务名称默认为空，让用户手动输入
    setTaskName('');
    setShowDialog(true);
  };

  const handleDeleteCategory = (type: string, path: string, name: string) => {
    setDeleteTarget({ type, path, name });
    setShowDeleteConfirm(true);
  };

  const handleCreateCategory = (type: 'top' | 'mid' | 'sub', parentPath: string = '') => {
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
        setCategories(result.categories);
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
      console.log('Sending delete request:', deleteTarget);
      
      const response = await fetch('/api/log-categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteTarget),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Delete result:', result);
        setCategories(result.categories);
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
      } else {
        const errorText = await response.text();
        console.error('Delete failed with status:', response.status, 'Error:', errorText);
        throw new Error(`删除失败: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // const handleSubmit = async () => {
  //   if (!taskName.trim()) {
  //     alert('请输入任务名称');
  //     return;
  //   }

  //   if (!duration.trim()) {
  //     alert('请输入时间消耗');
  //     return;
  //   }

  //   if (onSelected) {
  //     onSelected(selectedPath, taskName.trim());
  //     setShowDialog(false);
  //     setTaskName('');
  //     setSelectedPath('');
  //     return;
  //   }

  //   setIsLoading(true);
  //   try {
  //     const pathParts = selectedPath.split('/');
  //     const categories = [{
  //       name: pathParts[0] || '',
  //       subCategories: [{
  //         name: pathParts[1] || '',
  //         activities: [{
  //           name: pathParts[2] || taskName,
  //           duration: duration || '0h'
  //         }]
  //       }]
  //     }];

  //     const formData = new FormData();
  //     formData.append('categories', JSON.stringify(categories));
  //     formData.append('content', '');
  //     // 使用北京时间
  //     const beijingTime = getBeijingTime();
  //     formData.append('timestamp', beijingTime.toISOString());

  //     await createLog(formData);
      
  //     setTaskName('');
  //     setDuration('');
  //     setShowDialog(false);
      
  //     if (onLogSaved) {
  //       onLogSaved();
  //     }
  //   } catch (error) {
  //     console.error('创建日志失败:', error);
  //     alert('保存失败，请重试');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // 解析时间格式（支持 "1h20m", "45m", "2h" 等格式）
  const parseDuration = (value: string): string => {
    if (!value.trim()) return '';
    
    // 移除所有空格
    const cleanValue = value.replace(/\s/g, '');
    
    // 匹配格式：数字+h+数字+m 或 数字+h 或 数字+m
    const hourMinutePattern = /^(\d+)h(\d+)m$/;
    const hourPattern = /^(\d+)h$/;
    const minutePattern = /^(\d+)m$/;
    const numberPattern = /^(\d+)$/;
    
    if (hourMinutePattern.test(cleanValue)) {
      // 格式：1h20m
      const match = cleanValue.match(hourMinutePattern);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        return `${hours}h${minutes}m`;
      }
    } else if (hourPattern.test(cleanValue)) {
      // 格式：2h
      const match = cleanValue.match(hourPattern);
      if (match) {
        const hours = parseInt(match[1]);
        return `${hours}h`;
      }
    } else if (minutePattern.test(cleanValue)) {
      // 格式：45m
      const match = cleanValue.match(minutePattern);
      if (match) {
        const minutes = parseInt(match[1]);
        return `${minutes}m`;
      }
    } else if (numberPattern.test(cleanValue)) {
      // 纯数字，按分钟处理
      const minutes = parseInt(cleanValue);
      if (minutes < 60) {
        return `${minutes}m`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
          return `${hours}h`;
        } else {
          return `${hours}h${remainingMinutes}m`;
        }
      }
    }
    
    return '';
  };

  // 处理时间输入
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDuration(value);
  };

  // 在提交时转换时间格式
  const handleSubmitWithFormat = async () => {
    if (!taskName.trim()) {
      alert('请输入任务名称');
      return;
    }

    // 转换时间格式（如果输入了时间）
    let formattedDuration = '0h'; // 默认值
    if (duration.trim()) {
      formattedDuration = parseDuration(duration);
      if (!formattedDuration) {
        alert('请输入有效的时间格式，如：45m, 1h20m, 2h');
        return;
      }
    }

    if (onSelected) {
      onSelected(selectedPath, taskName.trim());
      setShowDialog(false);
      setTaskName('');
      setSelectedPath('');
      return;
    }

    setIsLoading(true);
    try {
      const pathParts = selectedPath.split('/');
      const categories = [{
        name: pathParts[0] || '',
        subCategories: [{
          name: pathParts[1] || '',
          activities: [{
            name: pathParts[2] || taskName,
            duration: formattedDuration
          }]
        }]
      }];

      const formData = new FormData();
      formData.append('categories', JSON.stringify(categories));
      formData.append('content', '');
      // 使用北京时间
      const beijingTime = getBeijingTime();
      formData.append('timestamp', beijingTime.toISOString());

      await createLog(formData);
      
      setTaskName('');
      setDuration('');
      setShowDialog(false);
      
      if (onLogSaved) {
        onLogSaved();
      }
    } catch (error) {
      console.error('创建日志失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitWithFormat();
    }
  };

  return (
    <div className={className}>
      {/* 创建分类按钮 */}
      <div className="mb-6">
        <Button
          onClick={() => handleCreateCategory('top')}
          className="bg-green-600 hover:bg-green-700"
        >
          + 创建顶级分类
        </Button>
      </div>
      
      {/* 分类卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((topCategory, index) => (
          <Card key={`${topCategory.id}-${index}`} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-lg font-bold text-gray-800 flex justify-between items-center">
                {topCategory.name}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleCreateCategory('mid', topCategory.name)}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteCategory('top', '', topCategory.name)}
                  >
                    删除
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3">
                {topCategory.children?.map((midCategory, midIndex) => (
                  <Card key={`${midCategory.id}-${midIndex}`} className="border border-gray-200 hover:border-blue-300 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                        {midCategory.name}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                            onClick={() => handleCreateCategory('sub', `${topCategory.name}/${midCategory.name}`)}
                          >
                            +
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                            onClick={() => handleDeleteCategory('mid', topCategory.name, midCategory.name)}
                          >
                            删除
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {midCategory.children?.map((subCategory, subIndex) => (
                          <div key={`${subCategory.id}-${subIndex}`} className="relative group">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs hover:bg-blue-50 hover:border-blue-300 pr-8"
                              onClick={() => handleSubCategoryClick(topCategory.name, midCategory.name, subCategory.name)}
                            >
                              {subCategory.name}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteCategory('sub', `${topCategory.name}/${midCategory.name}`, subCategory.name)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        {(!midCategory.children || midCategory.children.length === 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => handleSubCategoryClick(topCategory.name, midCategory.name, '')}
                          >
                            直接创建任务
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 任务输入弹框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>快速记录</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              在 <span className="font-medium text-blue-600">{selectedPath}</span> 下记录活动
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务名称
              </label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入具体事物名称..."
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                时间消耗 (可选)
              </label>
              <Input
                value={duration}
                onChange={handleDurationChange}
                onKeyDown={handleKeyDown}
                placeholder="如: 45m, 1h20m, 2h (为空则使用计时器)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitWithFormat} disabled={!taskName.trim() || isLoading}>
              {isLoading ? '保存中...' : '保存记录'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              确定要删除 {'"'}{deleteTarget?.name}{'"'} 吗？此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建分类对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新分类</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分类名称
              </label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入分类名称..."
                autoFocus
              />
            </div>
            {createType !== 'top' && (
              <p className="text-sm text-gray-600">
                将在 <span className="font-medium text-blue-600">{createParentPath}</span> 下创建新分类
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmCreate} disabled={!newCategoryName.trim()}>
              创建分类
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;



