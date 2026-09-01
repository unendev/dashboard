import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MemoBoard } from '../components/features/memo/MemoBoard';
import { AtomicWorkspace } from '../components/features/atomic/AtomicWorkspace';

const MemoPage = () => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskTitle, setTaskTitle] = useState<string | null>(null);
    const [storageKeyPrefix, setStorageKeyPrefix] = useState('manifesto-global');

    useEffect(() => {
        const computeAndApply = () => {
            try {
                const hash = window.location.hash || '';
                const qIndex = hash.indexOf('?');
                const hashQueryPart = qIndex >= 0 ? hash.slice(qIndex + 1) : '';
                const searchQueryPart = window.location.search ? window.location.search.replace(/^\?/, '') : '';
                const query = hashQueryPart || searchQueryPart;

                const params = new URLSearchParams(query);

                const id = params.get('id');
                const type = params.get('type');
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

        computeAndApply();
        window.addEventListener('hashchange', computeAndApply);
        return () => window.removeEventListener('hashchange', computeAndApply);
    }, []);

    const handleClose = () => {
        window.close();
    };

    // 如果是针对特定任务的专属小备注弹窗，展示 MemoBoard
    if (taskId) {
        return (
            <div className="flex flex-col h-screen w-screen bg-zinc-900 text-zinc-300 font-sans overflow-hidden">
                <div
                    className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800 shrink-0"
                    data-drag="true"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <h2 className="text-xs font-medium text-zinc-300 truncate">
                            {taskTitle || 'Task Memo'}
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
                        showVariables={false}
                        showHeader={false}
                    />
                </div>
            </div>
        );
    }

    // 默认展示全新的「即时原子工作台」
    return <AtomicWorkspace onClose={handleClose} />;
};

export default MemoPage;
