import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MemoBoard } from '../components/features/memo/MemoBoard';

const MemoPage = () => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskTitle, setTaskTitle] = useState<string | null>(null);
    const [storageKeyPrefix, setStorageKeyPrefix] = useState('manifesto-global');

    useEffect(() => {
        const hash = window.location.hash;
        const queryPart = hash.split('?')[1];
        const params = new URLSearchParams(queryPart);
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
            {taskId && (
                <div
                    className="h-9 flex items-center justify-between px-3 bg-[#1a1a1a] select-none border-b border-zinc-800 shrink-0"
                    data-drag="true"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xs font-medium text-zinc-300 truncate max-w-[200px]" title={taskTitle || ''}>
                            {taskTitle}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={handleClose}
                            className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-white hover:bg-red-500/20 transition-all"
                            data-drag="false"
                            title="Close"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {!taskId && (
                <div className="flex-none bg-[#1a1a1a] border-b border-zinc-800">
                     <div className="h-8 flex items-center justify-end px-3 select-none" data-drag="true">
                        <button
                            onClick={handleClose}
                            className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-white hover:bg-red-500/20 transition-all"
                            data-drag="false"
                            title="Close"
                        >
                            <X size={14} />
                        </button>
                     </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <MemoBoard 
                    storageKeyPrefix={storageKeyPrefix} 
                    title={taskId ? undefined : "CONSOLE :: CONFIG"} 
                    showVariables={!taskId}
                />
            </div>
        </div>
    );
};

export default MemoPage;
