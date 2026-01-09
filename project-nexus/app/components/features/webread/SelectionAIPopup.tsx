'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Loader2, Sparkles, Copy, Check, AlertCircle, ChevronDown, ChevronRight, User } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MarkdownView } from '@/app/components/shared/MarkdownView';
import { ReasoningBlock } from '@/app/components/shared/ReasoningBlock';
import { getAIConfig, getProviderBaseUrl, getAIRoles, getBookRole, setBookRole } from '@/lib/ai-config';
import * as webdavCache from '@/lib/webdav-cache';

// 高亮颜色配置（3种）
const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: 'bg-yellow-400', border: 'border-yellow-500', label: '黄色' },
  { id: 'green', bg: 'bg-emerald-400', border: 'border-emerald-500', label: '绿色' },
  { id: 'blue', bg: 'bg-blue-400', border: 'border-blue-500', label: '蓝色' },
];

interface SelectionAIPopupProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  bookTitle?: string;
  bookId?: string;
  cfiRange?: string;
  onNoteAdded?: (note: webdavCache.BookNote) => void;
}

// 推理过程显示组件已移至 @/app/components/shared/ReasoningBlock

export function SelectionAIPopup({ selectedText, position, onClose, bookTitle, bookId, cfiRange, onNoteAdded }: SelectionAIPopupProps) {
  const [copied, setCopied] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [mode, setMode] = useState<'idle' | 'ai' | 'note'>('idle');
  const [noteSaved, setNoteSaved] = useState(false);
  const [savedColor, setSavedColor] = useState<string>('');
  const popupRef = useRef<HTMLDivElement>(null);
  const hasSentRef = useRef(false);

  const config = getAIConfig();
  const roles = getAIRoles();
  const [selectedRoleId, setSelectedRoleId] = useState(() =>
    bookId ? getBookRole(bookId) : 'default'
  );
  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const chatTransport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
  }), []);

  const { messages, sendMessage, status, error } = useChat({
    id: `webread-${selectedText.substring(0, 20)}`,
    transport: chatTransport,
  });

  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
  const aiResponse = lastAssistantMessage?.parts
    ?.filter(p => p.type === 'text')
    .map(p => (p as any).text)
    .join('') || '';

  const reasoningParts = lastAssistantMessage?.parts?.filter(p => p.type === 'reasoning') || [];
  const reasoning = reasoningParts.map(p => (p as any).text || '').join('');
  const isReasoningStreaming = reasoningParts.some(p => (p as any).state === 'streaming');

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    if (bookId) {
      setBookRole(bookId, roleId);
    }
    setShowRoleSelector(false);
  };

  const askAI = async () => {
    setMode('ai');
    setConfigError(null);
    hasSentRef.current = true;

    if (!config.enabled) {
      setConfigError('AI 功能已禁用，请在设置中启用');
      return;
    }

    if (!config.apiKey) {
      setConfigError('未配置 API Key，请在书架设置中配置');
      return;
    }

    const systemPrompt = selectedRole.systemPrompt + (bookTitle ? `\n\n用户正在阅读《${bookTitle}》。` : '');

    const body: any = {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
    };

    if (config.provider === 'custom' && config.baseUrl) {
      body.baseUrl = config.baseUrl || getProviderBaseUrl(config.provider);
    }

    sendMessage(
      { text: `请解释这段文字：\n\n"${selectedText}"` },
      {
        body: {
          ...body,
          messages: [
            { role: 'system', content: systemPrompt },
          ]
        }
      }
    );
  };

  const handleSaveNote = async (color: string) => {
    if (!bookId) return;

    setMode('note');
    setSavedColor(color);

    // 调试日志
    console.log('[SelectionAIPopup] Saving note:', {
      bookId,
      selectedText: selectedText.substring(0, 50) + '...',
      cfiRange,
      color,
    });

    try {
      const note: webdavCache.BookNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        cfi: cfiRange || '',
        text: selectedText,
        note: '',
        color,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      console.log('[SelectionAIPopup] Note object:', note);

      await webdavCache.saveNote(bookId, note);
      setNoteSaved(true);

      // 通知父组件笔记已添加
      console.log('[SelectionAIPopup] Calling onNoteAdded with note');
      onNoteAdded?.(note);

      // 1秒后关闭
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  };

  const handleRetry = () => {
    hasSentRef.current = false;
    askAI();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 300),
    top: Math.max(position.y - 50, 10),
    zIndex: 100,
  };

  const displayError = configError || (error ? error.message : null);

  // 初始状态：显示问AI按钮和颜色选择球
  if (mode === 'idle') {
    return (
      <div
        ref={popupRef}
        style={popupStyle}
        className="bg-slate-800/95 backdrop-blur border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-2 p-2">
          <button
            onClick={askAI}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-300 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>问 AI</span>
          </button>
          <div className="w-px h-5 bg-slate-600" />
          {/* 颜色选择球 */}
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map(color => (
              <button
                key={color.id}
                onClick={() => handleSaveNote(color.id)}
                className={`w-6 h-6 rounded-full ${color.bg} hover:scale-110 transition-transform border-2 border-white/30 hover:border-white/60`}
                title={`${color.label}高亮`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 笔记保存状态
  if (mode === 'note') {
    const colorConfig = HIGHLIGHT_COLORS.find(c => c.id === savedColor) || HIGHLIGHT_COLORS[0];
    return (
      <div
        ref={popupRef}
        style={popupStyle}
        className={`bg-slate-800/95 backdrop-blur border ${colorConfig.border} rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          {noteSaved ? (
            <>
              <div className={`w-4 h-4 rounded-full ${colorConfig.bg}`} />
              <span className="text-sm text-slate-200">已添加高亮</span>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-300">保存中...</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // AI 模式
  return (
    <div
      ref={popupRef}
      style={popupStyle}
      className="w-[340px] max-h-[400px] bg-slate-800/95 backdrop-blur border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header with Role Selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <div className="relative">
            <button
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="flex items-center gap-1 text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors"
            >
              <User className="w-3 h-3" />
              <span>{selectedRole.name}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showRoleSelector ? 'rotate-180' : ''}`} />
            </button>
            {showRoleSelector && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden z-10">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleChange(role.id)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${role.id === selectedRoleId
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-300 hover:bg-slate-700'
                      }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Text */}
      <div className="px-3 py-2 bg-slate-900/30 border-b border-slate-700/30">
        <p className="text-xs text-slate-400 mb-1">选中内容</p>
        <p className="text-sm text-amber-200/90 line-clamp-3 italic">"{selectedText}"</p>
      </div>

      {/* AI Response */}
      <div className="px-3 py-3 max-h-[240px] overflow-y-auto custom-scrollbar">
        {displayError ? (
          <div className="flex items-start gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{displayError}</span>
          </div>
        ) : (
          <>
            {reasoning && (
              <ReasoningBlock
                content={reasoning}
                isStreaming={isReasoningStreaming}
                autoCollapse={!isLoading && !!aiResponse}
              />
            )}

            {isLoading && !aiResponse && !reasoning && (
              <div className="flex items-center gap-2 text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            )}

            {aiResponse && (
              <div className="text-sm text-slate-200 leading-relaxed">
                <MarkdownView content={aiResponse} variant="default" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {aiResponse && !isLoading && (
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-slate-700/30 bg-slate-900/30">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-700 rounded transition-colors"
          >
            <Send className="w-3 h-3" />
            <span>重新生成</span>
          </button>
        </div>
      )}
    </div>
  );
}
