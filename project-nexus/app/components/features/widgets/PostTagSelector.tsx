'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface PostTagSelectorProps {
  currentTags?: string[];
  availableTags?: string[]; // 全局标签池
  onTagsChange?: (tags: string[]) => void;
  isSaving?: boolean;
}

const PostTagSelector: React.FC<PostTagSelectorProps> = ({
  currentTags = [],
  availableTags = [],
  onTagsChange,
  isSaving = false
}) => {
  // UI 交互状态
  const [customTag, setCustomTag] = useState('');
  const [showInput, setShowInput] = useState(false);

  // 切换标签选中状态
  const handleToggleTag = (tag: string) => {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onTagsChange?.(newTags);
  };

  // 添加新标签
  const handleAddTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !currentTags.includes(trimmed)) {
      const newTags = [...currentTags, trimmed];
      onTagsChange?.(newTags);
      setCustomTag('');
      setShowInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setCustomTag('');
      setShowInput(false);
    }
  };

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      {/* 标签池 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white/70">标签池</h4>
          <span className="text-xs text-white/40">{availableTags.length} 个标签</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => {
            const isSelected = currentTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                {tag}
              </button>
            );
          })}
          
          {availableTags.length === 0 && (
            <p className="text-sm text-white/40">暂无标签，创建你的第一个标签吧</p>
          )}
        </div>
      </div>

      {/* 已选标签 */}
      {currentTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-white/70 mb-2">当前帖子标签</h4>
          <div className="flex flex-wrap gap-2">
            {currentTags.map(tag => (
              <button
                key={tag}
                onClick={(e) => e.preventDefault()}
                className="px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center gap-1.5
                         bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
              >
                <span>{tag}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTag(tag);
                  }}
                  className="p-0.5 rounded hover:bg-white/20 transition-colors cursor-pointer"
                  role="button"
                  title="移除"
                >
                  <X className="w-4 h-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 创建新标签 */}
      <div>
        <h4 className="text-sm font-medium text-white/70 mb-2">创建新标签</h4>
        {showInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入标签名称..."
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-sm 
                       text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <button
              onClick={handleAddTag}
              disabled={!customTag.trim() || isSaving}
              className="px-4 py-2 bg-emerald-500 text-white rounded-md text-sm font-medium 
                       hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              添加
            </button>
            <button
              onClick={() => {
                setCustomTag('');
                setShowInput(false);
              }}
              className="px-3 py-2 bg-white/10 text-white/70 rounded-md text-sm font-medium 
                       hover:bg-white/20 transition-colors"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="w-full px-4 py-2 bg-white/5 border border-dashed border-white/20 rounded-md text-sm 
                     text-white/60 hover:bg-white/10 hover:border-white/30 hover:text-white/80 
                     transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>创建新标签</span>
          </button>
        )}
      </div>
      
      {isSaving && (
        <div className="text-sm text-emerald-400/70 text-center py-2">
          保存中...
        </div>
      )}
    </div>
  );
};

export default PostTagSelector;
