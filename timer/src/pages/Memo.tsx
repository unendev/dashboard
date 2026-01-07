import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Settings2, Eye, Edit2 } from 'lucide-react';
import { MarkdownRenderer } from '@shared';

interface EnvVariable {
    id: string;
    key: string;
    value: string;
}

const MemoPage = () => {
    // --- State: Logic ---
    const [taskId, setTaskId] = useState<string | null>(null);
    const [taskTitle, setTaskTitle] = useState<string | null>(null);
    const [storageKeyPrefix, setStorageKeyPrefix] = useState('manifesto-global');

    // --- State: Data ---
    const [variables, setVariables] = useState<EnvVariable[]>([]);
    const [logContent, setLogContent] = useState('');

    // --- State: UI ---
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview'); // Default to preview, auto-switch on click/blur

    // --- Initialization ---
    useEffect(() => {
        // 1. Identify Context (Global vs Task)
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
            // Default to Task-Specific Variables if needed, or empty
        } else {
            // Global Mode defaults
        }
        setStorageKeyPrefix(prefix);

        // 2. Load Data for this Context
        // Variables (Only relevant for Global mostly, but we load for both consistency)
        const savedVars = localStorage.getItem(`${prefix}-vars`);
        if (savedVars) {
            try {
                setVariables(JSON.parse(savedVars));
            } catch (e) {
                setVariables(defaultVariables);
            }
        } else {
            // Only load defaults for GLOBAL context if empty
            if (!id) {
                setVariables(defaultVariables);
            } else {
                setVariables([]);
            }
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

    // --- Render Components ---

    // 1. Global Header: The Config Console
    const renderGlobalHeader = () => (
        <>
            <div
                className="h-8 flex items-center justify-between px-3 bg-[#1a1a1a] select-none border-b border-zinc-800"
                data-drag="true"
            >
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
                    <span>CONSOLE :: CONFIG</span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
                        data-drag="false"
                        title={isHeaderExpanded ? "Collapse" : "Expand"}
                    >
                        <span className="text-[10px] transform transition-transform duration-200" style={{ transform: isHeaderExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▴
                        </span>
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-white hover:bg-red-500/20 transition-all"
                        data-drag="false"
                        title="Close"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {isHeaderExpanded && (
                <div className="p-3 space-y-2 overflow-y-auto max-h-[40vh] custom-scrollbar bg-[#161616] border-b border-zinc-800">
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
                                title="Delete"
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
        </>
    );

    // 2. Task Header: Simple Title
    const renderTaskHeader = () => (
        <div
            className="h-9 flex items-center justify-between px-3 bg-[#1a1a1a] select-none border-b border-zinc-800"
            data-drag="true"
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-xs font-medium text-zinc-300 truncate max-w-[200px]" title={taskTitle || ''}>
                    {taskTitle}
                </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => window.close()}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-white hover:bg-red-500/20 transition-all"
                    data-drag="false"
                    title="Close"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen w-screen bg-zinc-900 text-zinc-300 font-sans overflow-hidden">

            {/* --- HEADER --- */}
            <header className="flex-none flex flex-col">
                {taskId ? renderTaskHeader() : renderGlobalHeader()}
            </header>

            {/* --- BODY: LOG / CONTENT --- */}
            <main
                className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
                onMouseEnter={() => setViewMode('edit')}
            >
                {viewMode === 'edit' ? (
                    <textarea
                        value={logContent}
                        onChange={(e) => saveLog(e.target.value)}
                        onBlur={() => setViewMode('preview')}
                        onKeyDown={(e) => {
                            if (e.ctrlKey) {
                                const textarea = e.currentTarget;
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const value = textarea.value;
                                const lines = value.split('\n');

                                // Helper: Find line index by character position
                                const getLineIndexAt = (pos: number) => value.substring(0, pos).split('\n').length - 1;

                                const currentLineIndex = getLineIndexAt(start);

                                if (e.key === 'd') {
                                    e.preventDefault();
                                    // Delete current line
                                    const newLines = [...lines];
                                    newLines.splice(currentLineIndex, 1);
                                    const newValue = newLines.join('\n');
                                    saveLog(newValue);

                                    // Restore cursor position (try to keep at same relative pos or end of prev line)
                                    requestAnimationFrame(() => {
                                        // Simple logic: go to start of next line which is now at currentLineIndex, 
                                        // or end of file if deleted last line.
                                        // Actually better: keep relative column or clamp.
                                        // For now, let's just put cursor at start of the line that took its place
                                        // Calculate position of start of currentLineIndex
                                        const pos = newLines.slice(0, currentLineIndex).reduce((acc, line) => acc + line.length + 1, 0);
                                        textarea.setSelectionRange(pos, pos);
                                    });
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    // Swap with previous
                                    if (currentLineIndex > 0) {
                                        const newLines = [...lines];
                                        const temp = newLines[currentLineIndex];
                                        newLines[currentLineIndex] = newLines[currentLineIndex - 1];
                                        newLines[currentLineIndex - 1] = temp;
                                        const newValue = newLines.join('\n');
                                        saveLog(newValue);

                                        // Move cursor to follow the line
                                        requestAnimationFrame(() => {
                                            // New index is current - 1
                                            const newIndex = currentLineIndex - 1;
                                            // Calculate start of new line
                                            const lineStart = newLines.slice(0, newIndex).reduce((acc, line) => acc + line.length + 1, 0);
                                            // Column offset
                                            const lineStartBefore = lines.slice(0, currentLineIndex).reduce((acc, line) => acc + line.length + 1, 0);
                                            const col = start - lineStartBefore;
                                            const newPos = lineStart + Math.min(col, newLines[newIndex].length);
                                            textarea.setSelectionRange(newPos, newPos);
                                        });
                                    }

                                } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    // Swap with next
                                    if (currentLineIndex < lines.length - 1) {
                                        const newLines = [...lines];
                                        const temp = newLines[currentLineIndex];
                                        newLines[currentLineIndex] = newLines[currentLineIndex + 1];
                                        newLines[currentLineIndex + 1] = temp;
                                        const newValue = newLines.join('\n');
                                        saveLog(newValue);

                                        // Move cursor to follow the line
                                        requestAnimationFrame(() => {
                                            // New index is current + 1
                                            const newIndex = currentLineIndex + 1;
                                            // Calculate start of new line
                                            const lineStart = newLines.slice(0, newIndex).reduce((acc, line) => acc + line.length + 1, 0);
                                            // Column offset
                                            const lineStartBefore = lines.slice(0, currentLineIndex).reduce((acc, line) => acc + line.length + 1, 0);
                                            const col = start - lineStartBefore;
                                            const newPos = lineStart + Math.min(col, newLines[newIndex].length);
                                            textarea.setSelectionRange(newPos, newPos);
                                        });
                                    }
                                }
                            }
                        }}
                        autoFocus
                        className="flex-1 w-full h-full bg-transparent resize-none border-none outline-none p-4 text-sm leading-relaxed text-zinc-300 placeholder-zinc-700 custom-scrollbar font-mono"
                        placeholder={taskId ? `// Notes for ${taskTitle}...` : "// Runtime logs..."}
                        spellCheck={false}
                        data-drag="false"
                    />
                ) : (
                    <div
                        className="flex-1 w-full h-full p-4 overflow-y-auto custom-scrollbar cursor-text"
                        onClick={() => setViewMode('edit')}
                    >
                        <MarkdownRenderer
                            content={logContent || (taskId ? '*No notes yet.*' : '*System Standby.*')}
                            variant="goc"
                            className="prose-sm max-w-none"
                        />
                    </div>
                )}

                {/* Footer Info */}
                <div className="h-6 flex items-center justify-between px-4 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-600 select-none">
                    <div className="flex items-center gap-2">
                        <span>{logContent.length} chars</span>
                        <span className="text-zinc-700">|</span>
                        <span>{viewMode === 'edit' ? 'EDITABLE' : 'READONLY'}</span>
                    </div>
                    <span>{taskId ? 'TASK' : 'GLOBAL'}</span>
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
