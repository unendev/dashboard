'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Edit2, Check, X } from 'lucide-react';

interface InstanceTagSwitcherProps {
  currentInstanceTag?: string | null;
  onUpdate: (newInstanceTag: string | null) => Promise<void>;
  disabled?: boolean;
}

const InstanceTagSwitcher: React.FC<InstanceTagSwitcherProps> = ({
  currentInstanceTag,
  onUpdate,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当进入编辑模式时，设置初始值并聚焦输入框
  useEffect(() => {
    if (isEditing) {
      setEditValue(currentInstanceTag || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isEditing, currentInstanceTag]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleSave = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const newValue = editValue.trim() || null;
      await onUpdate(newValue);
      setIsEditing(false);
      setEditValue('');
    } catch (error) {
      console.error('更新实例标签失败:', error);
      // 可以在这里添加错误提示
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // 如果正在编辑，显示输入框
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入实例标签，如 @OnePieceManga..."
          className="text-sm h-8"
          disabled={isLoading}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isLoading}
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isLoading}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // 显示当前实例标签和编辑按钮
  return (
    <div className="flex items-center gap-2">
      {currentInstanceTag ? (
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          {currentInstanceTag}
        </span>
      ) : (
        <span className="text-sm text-gray-500 italic">无实例标签</span>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleStartEdit}
        disabled={disabled}
        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default InstanceTagSwitcher;




