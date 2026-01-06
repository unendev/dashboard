import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Settings2 } from 'lucide-react';

// Scheme B: "The Config"
// Features: Dynamic Key-Value Editor, Clean UI, Task Isolation

interface EnvVariable {
    id: string;
    key: string;
    value: string;
}

const MemoPage = () => {
    // --- State: Logic ---
    const [taskId, setTaskId] = useState<string | null>(null);
    const [storageKeyPrefix, setStorageKeyPrefix] = useState('manifesto-global');

    // --- State: Data ---
    const [variables, setVariables] = useState<EnvVariable[]>([]);
    const [logContent, setLogContent] = useState('');

    // --- State: UI ---
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);

    // --- Initialization ---
    useEffect(() => {
        // 1. Identify Context (Global vs Task)
        const hash = window.location.hash;
        const queryPart = hash.split('?')[1];
        const params = new URLSearchParams(queryPart);
        const id = params.get('id');
        const type = params.get('type');

        let prefix = 'manifesto-global';
        if (id && type === 'task') {
            setTaskId(id);
            prefix = `task-memo-${id}`;
        }
        setStorageKeyPrefix(prefix);

        // 2. Load Data for this Context
        // Variables
        const savedVars = localStorage.getItem(`${prefix}-vars`);
        if (savedVars) {
            try {
                setVariables(JSON.parse(savedVars));
            } catch (e) {
                setVariables(defaultVariables);
            }
        } else {
            setVariables(defaultVariables);
        }

        // Log
        const savedLog = localStorage.getItem(`${prefix}-log`);
        if (savedLog) setLogContent(savedLog);

    }, []);

    const defaultVariables: EnvVariable[] = [
        { id: '1', key: 'CURRENT_MISSION', value: 'Defining the Objective...' },
        { id: '2', key: 'STATUS', value: 'PLANNING' },
    ];

    // --- Persistence Wrappers ---
    const saveVariables = (newVars: EnvVariable[]) => {
        setVariables(newVars);
        localStorage.setItem(`${storageKeyPrefix}-vars`, JSON.stringify(newVars));
    };

    const saveLog = (val: string) => {
        setLogContent(val);
        localStorage.setItem(`${storageKeyPrefix}-log`, val);
    };

    // --- Handlers ---
    const addVariable = () => {
        const newVar = { id: Date.now().toString(), key: 'NEW_KEY', value: '' };
        saveVariables([...variables, newVar]);
    };

    const removeVariable = (id: string) => {
        saveVariables(variables.filter(v => v.id !== id));
    };

    const updateVariable = (id: string, field: 'key' | 'value', val: string) => {
        const newVars = variables.map(v =>
            v.id === id ? { ...v, [field]: val } : v
        );
        saveVariables(newVars);
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-[#111] text-zinc-300 font-sans overflow-hidden">

            {/* --- HEADER: ENV OVERVIEW --- */}
            <header className="flex-none bg-[#161616] border-b border-zinc-800 flex flex-col">
                {/* Title Bar (Draggable) */}
                <div
                    className="h-8 flex items-center justify-between px-3 bg-[#1a1a1a] select-none"
                    data-drag="true"
                >
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 tracking-wider">
                        <Settings2 size={12} />
                        {taskId ? `ENV_CONFIG :: ${taskId}` : 'ENV_CONFIG :: GLOBAL'}
                    </div>
                    <button
                        onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                        className="text-zinc-600 hover:text-zinc-400 focus:outline-none"
                        data-drag="false"
                    >
                        <span className="text-[10px]">{isHeaderExpanded ? '▼' : '▶'}</span>
                    </button>
                </div>

                {/* Variables Grid (No Drag) */}
                {isHeaderExpanded && (
                    <div className="p-3 space-y-2 overflow-y-auto max-h-[40vh] custom-scrollbar">
                        {variables.map((v) => (
                            <div key={v.id} className="flex items-center gap-2 group">
                                {/* KEY */}
                                <div className="relative shrink-0 w-1/3 min-w-[100px]">
                                    <span className="absolute left-2 top-1.5 text-zinc-600 text-[10px] font-mono select-none">$</span>
                                    <input
                                        value={v.key}
                                        onChange={(e) => updateVariable(v.id, 'key', e.target.value)}
                                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-2 pl-5 py-1 text-xs font-mono text-purple-400 focus:border-zinc-600 focus:outline-none transition-colors uppercase placeholder-zinc-700"
                                        placeholder="KEY"
                                        data-drag="false"
                                        spellCheck={false}
                                    />
                                </div>

                                {/* EQUALS */}
                                <span className="text-zinc-700 font-mono text-xs">=</span>

                                {/* VALUE */}
                                <div className="flex-1 relative">
                                    <input
                                        value={v.value}
                                        onChange={(e) => updateVariable(v.id, 'value', e.target.value)}
                                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:border-zinc-600 focus:outline-none transition-colors placeholder-zinc-700"
                                        placeholder="Value..."
                                        data-drag="false"
                                    />
                                </div>

                                {/* DELETE */}
                                <button
                                    onClick={() => removeVariable(v.id)}
                                    className="p-1 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Variable"
                                    data-drag="false"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        {/* Add Button */}
                        <button
                            onClick={addVariable}
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors mt-2"
                            data-drag="false"
                        >
                            <Plus size={10} />
                            <span>Add Variable</span>
                        </button>
                    </div>
                )}
            </header>

            {/* --- BODY: LOG --- */}
            <main className="flex-1 flex flex-col min-h-0 bg-[#111] relative">
                <textarea
                    value={logContent}
                    onChange={(e) => saveLog(e.target.value)}
                    className="flex-1 w-full h-full bg-transparent resize-none border-none outline-none p-4 text-sm leading-relaxed text-zinc-400 placeholder-zinc-800 custom-scrollbar font-mono"
                    placeholder="// Runtime logs..."
                    spellCheck={false}
                    data-drag="false"
                />

                {/* Footer Info */}
                <div className="h-6 flex items-center px-4 bg-[#111] border-t border-zinc-900 text-[10px] text-zinc-700 select-none">
                    <span>MEM_SIZE: {logContent.length}B</span>
                    <span className="mx-2">|</span>
                    <span>MODE: {taskId ? 'TASK_CONTEXT' : 'GLOBAL_CONTEXT'}</span>
                </div>
            </main>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
        </div>
    );
};

export default MemoPage;
