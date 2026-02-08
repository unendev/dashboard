import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MemoBoard } from '../components/features/memo/MemoBoard';

const MemoPage = () => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskTitle, setTaskTitle] = useState<string | null>(null);
    const [storageKeyPrefix, setStorageKeyPrefix] = useState('manifesto-global');

    useEffect(() => {
        const computeAndApply = () => {
            try {
                // HashRouter: query 常在 hash 里（#/memo?type=task&id=...）
                // 但为了兼容其它打开方式，也支持 window.location.search
                const hash = window.location.hash || '';
                const qIndex = hash.indexOf('?');
                const hashQueryPart = qIndex >= 0 ? hash.slice(qIndex + 1) : '';
                const searchQueryPart = window.location.search ? window.location.search.replace(/^\?/, '') : '';
                const query = hashQueryPart || searchQueryPart;

                const params = new URLSearchParams(query);

                const id = params.get('id');
                const type = params.get('type');
                // URLSearchParams 已经会做 decode，这里不要二次 decode（否则遇到 % 字符可能抛错导致回退为全局）
                const title = params.get('title');

                let prefix = 'manifesto-global';
                if (id && type === 'task') {
                    setTaskId(id);
                    setTaskTitle(title || 'Task Memo');
                    prefix = `task-memo-${id}`;
                } else {
                    setTaskId(null);
                    setTaskTitle(null);
                }
                setStorageKeyPrefix(prefix);
            } catch (e) {
                console.error('[MemoPage] Failed to parse memo query:', e);
                setTaskId(null);
                setTaskTitle(null);
                setStorageKeyPrefix('manifesto-global');
            }
        };

        // 初次计算
        computeAndApply();

        // 兼容 Electron/HashRouter 某些场景下 hash 在初次渲染后才稳定
        window.addEventListener('hashchange', computeAndApply);
        return () => window.removeEventListener('hashchange', computeAndApply);
    }, []);

    const handleClose = () => {
        window.close();
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-zinc-900 text-zinc-300 font-sans overflow-hidden">
            <div
                className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800 shrink-0"
                data-drag="true"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-xs font-medium text-zinc-300 truncate">
                        {taskId ? (taskTitle || 'Task Memo') : '备忘录'}
                    </h2>
                    {/* Debug: 用于确认是否正确进入 task-memo 前缀（避免误判“联通”） */}
                    <span className="text-[10px] text-zinc-500 truncate max-w-[140px]" title={storageKeyPrefix}>
                        {storageKeyPrefix}
                    </span>
                </div>
                <button
                    onClick={handleClose}
                    className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-600 transition-colors"
                    data-drag="false"
                    title="Close"
                >
                    <X size={12} />
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <MemoBoard 
                    storageKeyPrefix={storageKeyPrefix} 
                    title={undefined}
                    showVariables={!taskId}
                    showHeader={false}
                />
            </div>
        </div>
    );
};

export default MemoPage;
