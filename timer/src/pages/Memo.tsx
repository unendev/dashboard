import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
// import useSWR, { mutate } from 'swr'; // Removed for local only
// import { fetcher } from '@/lib/api'; // Removed for local only
// import { fetchWithRetry } from '@/lib/fetch-utils'; // Removed for local only
import { MarkdownView } from '../components/shared/MarkdownView';

const MEMO_STORAGE_KEY = 'memo-content-v1';
const TASK_MEMO_STORAGE_KEY = 'task-memo-content-v1';
const MEMO_UPDATED_KEY = 'memo-updated-at';

// interface MemoData { ... } // Not needed for local only

export default function MemoPage() {
  // Parse query params manually since we are in HashRouter and location.search depends on where the hash is
  // Electron URL: file://.../index.html#/memo?type=task
  // or http://.../#/memo?type=task&id=123
  const [memoType, setMemoType] = useState<'default' | 'task'>('default');
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    // 简单的解析逻辑，兼容 Hash 路由后面的参数
    const hash = window.location.hash; // #/memo?type=task&id=...
    const urlParams = new URLSearchParams(hash.split('?')[1]);

    if (urlParams.get('type') === 'task') {
      setMemoType('task');
      setTaskId(urlParams.get('id')); // Get Task ID
    }
  }, []);

  const storageKey = memoType === 'task' && taskId ? `${TASK_MEMO_STORAGE_KEY}-${taskId}` : MEMO_STORAGE_KEY;
  const pageTitle = memoType === 'task' ? '任务备注' : '备忘录';

  // const { data: memo, isLoading } = useSWR<MemoData>('/api/widget/memo', fetcher); // Removed
  const isLoading = false; // Mock loading state
  const [content, setContent] = useState('');

  // Initial load effect depend on key change
  useEffect(() => {
    const saved = localStorage.getItem(storageKey) || '';
    setContent(saved);
  }, [storageKey]);

  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Removed server sync useEffect
  /* 
  // 当从服务器加载到数据时同步到本地状态
  useEffect(() => {
    // ... logic removed ...
  }, [memo, isEditing]);
  */

  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isEditing]);

  // 自动保存逻辑（仅本地）
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // 立即保存到本地
    const now = Date.now();
    localStorage.setItem(storageKey, newContent);
    localStorage.setItem(MEMO_UPDATED_KEY, now.toString());

    // Removed server sync
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-900 text-zinc-100 select-none overflow-hidden">
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800 shrink-0"
        data-drag="true"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium text-zinc-300">{pageTitle}</h2>
          {isLoading && <Loader2 size={10} className="animate-spin text-zinc-500" />}
        </div>
        <button
          onClick={() => window.close()}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-600 transition-colors"
          data-drag="false"
        >
          <X size={12} />
        </button>
      </div>

      {/* 编辑/预览区域 */}
      <div
        className="flex-1 min-h-0 overflow-hidden cursor-text"
        onClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={textAreaRef}
            className="w-full h-full bg-zinc-900 p-3 text-sm text-zinc-200 resize-none focus:outline-none leading-relaxed overflow-y-auto"
            value={content}
            onChange={handleContentChange}
            onBlur={() => setIsEditing(false)}
            placeholder="输入笔记... (支持 Markdown)"
          />
        ) : (
          <div className="w-full h-full p-3 overflow-y-auto">
            {content ? (
              <MarkdownView content={content} className="text-sm" />
            ) : (
              <div className="text-zinc-500 text-sm">
                {isLoading ? '加载中...' : '点击开始编辑...'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="px-3 py-1.5 border-t border-zinc-700 bg-zinc-800 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-zinc-500">
          {content.length} 字符
        </span>
        <span className="text-[10px] text-zinc-500">
          本地存储
        </span>
      </div>
    </div>
  );
}
