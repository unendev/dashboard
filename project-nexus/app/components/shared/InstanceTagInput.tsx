'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/app/components/ui/input';

interface InstanceTagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const InstanceTagInput: React.FC<InstanceTagInputProps> = ({
  value,
  onChange,
  placeholder = "输入实例标签，如 @OnePieceManga...",
  className = "",
  autoFocus = false
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // 获取实例标签建议
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/timer-tasks/instance-tags?userId=user-1`);
      const data = await response.json();
      
      if (data.instanceTags) {
        const filtered = data.instanceTags.filter((tag: string) =>
          tag.toLowerCase().includes(query.toLowerCase())
        );
        setSuggestions(filtered.slice(0, 5)); // 最多显示5个建议
      }
    } catch (error) {
      console.error('获取实例标签建议失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length > 0) {
      fetchSuggestions(newValue);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 选择建议
  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} ${showSuggestions ? 'rounded-b-none' : ''}`}
        autoFocus={autoFocus}
      />
      
      {/* 建议下拉框 */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionRef}
          className="absolute z-50 w-full bg-white border border-t-0 border-gray-200 rounded-b-md shadow-lg max-h-40 overflow-y-auto"
        >
          {loading ? (
            <div className="p-2 text-sm text-gray-500 text-center">
              加载中...
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                onClick={() => selectSuggestion(suggestion)}
              >
                <span className="text-blue-600 font-medium">{suggestion}</span>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* 帮助文本 */}
      {value && !value.startsWith('@') && (
        <div className="text-xs text-amber-600 mt-1">
          建议以 @ 开头，如 @OnePieceManga
        </div>
      )}
    </div>
  );
};

export default InstanceTagInput;




