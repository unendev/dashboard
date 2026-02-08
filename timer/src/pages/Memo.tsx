import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { MemoBoard } from '../components/features/memo/MemoBoard';

const MemoPage = () => {
    const location = useLocation();
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskTitle, setTaskTitle] = useState<string | null>(null);
    const [storageKeyPrefix, setStorageKeyPrefix] = useState('manifesto-global');

    useEffect(() => {
        // 首选：使用 React Router 的 location（HashRouter 下也能正确拿到 search）
        let params = new URLSearchParams(location.search || '');

        // 兜底：部分 Electron loadFile(hash=...) 场景会把 ? & 编码进 hash（%3F %26），导致 location.search 为空
        if (![...params.keys()].length) {
            try {
                const rawHash = (window.location.hash || '').replace(/^#/, '');
                const decodedHash = decodeURIComponent(rawHash);
                const queryPart = decodedHash.includes('?') ? decodedHash.split('?')[1] : '';
                params = new URLSearchParams(queryPart);
            } catch {
                // ignore
            }
        }

        const id = params.get('id');
        const type = params.get('type');
        const rawTitle = params.get('title');
        const title = rawTitle ? (() => {
            try { return decodeURIComponent(rawTitle); } catch { return rawTitle; }
        })() : null;

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
    }, [location.search, location.hash]);

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
