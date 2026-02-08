import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MemoBoard } from '../components/features/memo/MemoBoard';

const MemoPage = () => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskTitle, setTaskTitle] = useState<string | null>(null);
    const [storageKeyPrefix, setStorageKeyPrefix] = useState('manifesto-global');

    useEffect(() => {
        // HashRouter: query 常在 hash 里（#/memo?type=task&id=...）
        // 但为了兼容其它打开方式，也支持 window.location.search
        const hash = window.location.hash || '';
        const hashQueryPart = hash.includes('?') ? hash.split('?')[1] : '';
        const searchQueryPart = window.location.search ? window.location.search.replace(/^\?/, '') : '';
        const params = new URLSearchParams(hashQueryPart || searchQueryPart);

        const id = params.get('id');
        const type = params.get('type');
        const title = params.get('title');

        let prefix = 'manifesto-global';
        if (id && type === 'task') {
            setTaskId(id);
            setTaskTitle(title || 'Task Memo');
            prefix = `task-memo-${id}`;
        }
        setStorageKeyPrefix(prefix);
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
