import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { X, CheckSquare, Square, Trash2, StickyNote, Activity, GripVertical } from 'lucide-react';
import { Project, STORAGE_KEY_PROJECTS, TodoItem } from '../lib/project-types';
import { MarkdownRenderer } from '@shared';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Helper: Find Todo in Tree ---
const findTodoInTree = (todos: TodoItem[], id: string): { item: TodoItem, parent: TodoItem | null, list: TodoItem[], index: number } | null => {
    for (let i = 0; i < todos.length; i++) {
        if (todos[i].id === id) {
            return { item: todos[i], parent: null, list: todos, index: i };
        }
        if (todos[i].children) {
            const found = findTodoInTree(todos[i].children!, id);
            if (found) {
                return { ...found, parent: found.parent || todos[i] };
            }
        }
    }
    return null;
};

// --- Sortable Todo Item Component ---
function SortableTodoItem({ todo, toggleTodo, deleteTodo, openMemo }: {
    todo: TodoItem,
    toggleTodo: (id: string) => void,
    deleteTodo: (id: string) => void,
    openMemo: (id: string, text: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: todo.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: isDragging ? 'relative' as const : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-1">
            <div
                {...attributes}
                {...listeners}
                className={`group flex items-start gap-2 p-3 rounded-md transition-all border ${isDragging
                    ? 'bg-zinc-800 shadow-xl opacity-80 border-zinc-600 scale-[1.02]'
                    : 'bg-zinc-800/30 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-800/50'
                    }`}
            >
                <button
                    onClick={() => toggleTodo(todo.id)}
                    className="mt-0.5 text-zinc-600 hover:text-emerald-500 transition-colors shrink-0"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Square size={16} strokeWidth={1.5} />
                </button>
                <span
                    className="flex-1 text-sm text-zinc-400 group-hover:text-zinc-300 break-all leading-relaxed cursor-text"
                    onDoubleClick={() => openMemo(todo.id, todo.text)}
                >
                    {todo.text}
                </span>
                <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity shrink-0"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Trash2 size={13} strokeWidth={1.5} />
                </button>
            </div>
            {/* Recursive Children */}
            {todo.children && todo.children.length > 0 && (
                <div className="pl-4 border-l border-zinc-800 ml-3 mt-1 space-y-1">
                    <SortableContext
                        items={todo.children.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {todo.children.map(child => (
                            <SortableTodoItem
                                key={child.id}
                                todo={child}
                                toggleTodo={toggleTodo}
                                deleteTodo={deleteTodo}
                                openMemo={openMemo}
                            />
                        ))}
                    </SortableContext>
                </div>
            )}
        </div>
    );
}

// --- Sortable Todo Group Component ---
function SortableTodoGroup({ group, todos, toggleTodo, deleteTodo, openMemo }: {
    group: string,
    todos: TodoItem[],
    toggleTodo: (id: string) => void,
    deleteTodo: (id: string) => void,
    openMemo: (id: string, text: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: group, data: { type: 'group' } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 40 : 'auto',
        position: isDragging ? 'relative' as const : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className="space-y-1">
            {group !== 'Ungrouped' && (
                <div
                    {...attributes}
                    {...listeners}
                    className={`flex items-center gap-2 mb-2 mt-4 px-1 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
                >
                    <div className="h-px bg-zinc-800 flex-1"></div>
                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest bg-zinc-900/50 px-2 py-0.5 rounded border border-emerald-500/20 hover:bg-zinc-800 transition-colors">
                        {group}
                    </span>
                    <div className="h-px bg-zinc-800 flex-1"></div>
                </div>
            )}
            <SortableContext
                items={todos.map(t => t.id)}
                strategy={verticalListSortingStrategy}
            >
                {todos.map(todo => (
                    <SortableTodoItem
                        key={todo.id}
                        todo={todo}
                        toggleTodo={toggleTodo}
                        deleteTodo={deleteTodo}
                        openMemo={openMemo}
                    />
                ))}
            </SortableContext>
        </div>
    );
}

export default function ProjectDetail() {
    const { id } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [tab, setTab] = useState<'todo' | 'progress' | 'memo'>('todo');
    const [memoView, setMemoView] = useState<'preview' | 'edit'>('preview');

    const [todoInput, setTodoInput] = useState('');
    const [todoGroupInput, setTodoGroupInput] = useState('');
    const [progressInput, setProgressInput] = useState('');

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        const loadProject = () => {
            const projectsStr = localStorage.getItem(STORAGE_KEY_PROJECTS);
            if (projectsStr && id) {
                const projects: Project[] = JSON.parse(projectsStr);
                const found = projects.find(p => p.id === id);
                if (found) {
                    setProject(found);
                    setTitleInput(found.name);
                }
            }
        };
        loadProject();
        window.addEventListener('storage', loadProject);
        return () => window.removeEventListener('storage', loadProject);
    }, [id]);

    const saveProject = (updates: Partial<Project>) => {
        if (!project || !id) return;
        const updated = { ...project, ...updates, updatedAt: Date.now() };
        setProject(updated);

        const projectsStr = localStorage.getItem(STORAGE_KEY_PROJECTS);
        const projects: Project[] = projectsStr ? JSON.parse(projectsStr) : [];
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
            projects[index] = updated;
            localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
            window.dispatchEvent(new Event('storage'));
        }
    };

    const handleTitleSave = () => {
        if (titleInput.trim()) {
            saveProject({ name: titleInput.trim() });
        }
        setIsEditingTitle(false);
    };

    const addTodo = () => {
        if (!todoInput.trim()) return;
        const newTodo: TodoItem = {
            id: crypto.randomUUID(),
            text: todoInput.trim(),
            completed: false,
            group: todoGroupInput.trim() || undefined,
            createdAt: new Date().toISOString()
        };
        saveProject({ todos: [newTodo, ...(project?.todos || [])] });
        setTodoInput('');
    };

    const addProgress = () => {
        if (!progressInput.trim()) return;
        const newLog = {
            id: crypto.randomUUID(),
            text: progressInput.trim(),
            createdAt: Date.now()
        };
        saveProject({ progressLogs: [newLog, ...(project?.progressLogs || [])] });
        setProgressInput('');
    };

    const toggleTodo = (todoId: string) => {
        const toggleRecursive = (list: TodoItem[]): TodoItem[] => {
            return list.map(t => {
                if (t.id === todoId) return { ...t, completed: !t.completed };
                if (t.children) return { ...t, children: toggleRecursive(t.children) };
                return t;
            });
        };
        if (project) saveProject({ todos: toggleRecursive(project.todos) });
    };

    const deleteTodo = (todoId: string) => {
        const deleteRecursive = (list: TodoItem[]): TodoItem[] => {
            return list.filter(t => t.id !== todoId).map(t => ({
                ...t,
                children: t.children ? deleteRecursive(t.children) : undefined
            }));
        };
        if (project) saveProject({ todos: deleteRecursive(project.todos) });
    };

    const saveMemo = (text: string) => {
        saveProject({ memo: text });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !project) return;

        // Handle Group DnD
        if (active.data.current?.type === 'group') {
            const activeId = active.id as string;
            const overId = over.id as string;
            if (activeId !== overId) {
                const groupedTodos = project.todos.filter(t => !t.completed).reduce((acc, todo) => {
                    const group = todo.group || 'Ungrouped';
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(todo);
                    return acc;
                }, {} as Record<string, TodoItem[]>);

                const currentOrder = Array.from(new Set([...(project.groupOrder || []), ...Object.keys(groupedTodos)]));
                const oldIndex = currentOrder.indexOf(activeId);
                const newIndex = currentOrder.indexOf(overId);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
                    saveProject({ groupOrder: newOrder });
                }
            }
            return;
        }

        if (active.id === over.id) return;

        const source = findTodoInTree(project.todos, active.id as string);
        const dest = findTodoInTree(project.todos, over.id as string);

        if (!source || !dest) return;

        if (source.list === dest.list) {
            const newList = arrayMove(source.list, source.index, dest.index);
            const updateListInTree = (list: TodoItem[]): TodoItem[] => {
                if (list === source.list) return newList;
                return list.map(t => {
                    if (t.children) return { ...t, children: updateListInTree(t.children) };
                    return t;
                });
            };
            saveProject({ todos: updateListInTree(project.todos) });
        }
    };

    const openMemoWindow = (taskId: string, taskName: string) => {
        // @ts-ignore
        window.electron?.send('open-task-memo-window', { taskId, taskName });
    };

    const activeTodos = useMemo(() => project?.todos.filter(t => !t.completed) || [], [project]);
    const completedTodos = useMemo(() => project?.todos.filter(t => t.completed) || [], [project]);

    if (!project) return <div className="p-4 text-zinc-500">Loading...</div>;

    return (
        <div className="flex flex-col h-screen bg-[#1a1a1a] text-zinc-100 font-sans select-none overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex flex-col shrink-0 bg-zinc-900 border-b border-zinc-800" data-drag="true">
                <div className="flex items-center justify-between px-3 py-2">
                    {isEditingTitle ? (
                        <input
                            value={titleInput}
                            onChange={e => setTitleInput(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                            className="text-sm font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 w-full focus:outline-none focus:border-emerald-500"
                            autoFocus
                            data-drag="false"
                        />
                    ) : (
                        <span
                            className="text-sm font-bold text-zinc-200 truncate cursor-pointer hover:bg-zinc-800 px-1 py-0.5 rounded transition-colors"
                            onClick={() => { setIsEditingTitle(true); }}
                            data-drag="false"
                            title="点击重命名"
                        >
                            {project.name}
                        </span>
                    )}
                    <button onClick={() => window.close()} className="text-zinc-600 hover:text-red-400" data-drag="false"><X size={14} /></button>
                </div>

                <div className="flex items-center gap-1 px-1 pb-1" data-drag="false">
                    <button
                        onClick={() => setTab('todo')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${tab === 'todo' ? 'bg-[#1a1a1a] text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <CheckSquare size={12} /> 待办
                        <span className="bg-zinc-800 text-zinc-500 text-[9px] px-1 rounded-full">{project.todos.length}</span>
                    </button>
                    <button
                        onClick={() => setTab('progress')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${tab === 'progress' ? 'bg-[#1a1a1a] text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Activity size={12} /> 进展
                    </button>
                    <button
                        onClick={() => setTab('memo')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${tab === 'memo' ? 'bg-[#1a1a1a] text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <StickyNote size={12} /> 草稿
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-[#1a1a1a]">
                {tab === 'todo' && (
                    <div className="h-full flex flex-col p-3">
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-2">
                            <div className="space-y-4">
                                {project.todos.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-20 text-zinc-700 gap-2">
                                        <CheckSquare size={24} className="opacity-20" />
                                        <span className="text-xs">暂无任务</span>
                                    </div>
                                )}

                                {activeTodos.length > 0 && (() => {
                                    const groupedTodos = activeTodos.reduce((acc, todo) => {
                                        const group = todo.group || 'Ungrouped';
                                        if (!acc[group]) acc[group] = [];
                                        acc[group].push(todo);
                                        return acc;
                                    }, {} as Record<string, TodoItem[]>);

                                    const sortedGroups = Object.keys(groupedTodos).sort((a, b) => {
                                        if (project.groupOrder && project.groupOrder.length > 0) {
                                            const indexA = project.groupOrder.indexOf(a);
                                            const indexB = project.groupOrder.indexOf(b);
                                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                            if (indexA !== -1) return -1;
                                            if (indexB !== -1) return 1;
                                        }
                                        if (a === 'Ungrouped') return 1;
                                        if (b === 'Ungrouped') return -1;
                                        return a.localeCompare(b);
                                    });

                                    return (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext items={sortedGroups} strategy={verticalListSortingStrategy}>
                                                {sortedGroups.map(group => (
                                                    <SortableTodoGroup
                                                        key={group}
                                                        group={group}
                                                        todos={groupedTodos[group]}
                                                        toggleTodo={toggleTodo}
                                                        deleteTodo={deleteTodo}
                                                        openMemo={openMemoWindow}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    );
                                })()}
                            </div>

                            {completedTodos.length > 0 && (
                                <div className="pt-2">
                                    <button
                                        onClick={() => setShowCompleted(!showCompleted)}
                                        className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 mb-2 w-full"
                                    >
                                        <span>已完成 ({completedTodos.length})</span>
                                        <div className="h-px bg-zinc-800 flex-1"></div>
                                    </button>

                                    {showCompleted && (
                                        <div className="space-y-1 opacity-60">
                                            {completedTodos.map(todo => (
                                                <div key={todo.id} className="group flex items-start gap-2 p-2 rounded hover:bg-zinc-800/30 transition-colors">
                                                    <button
                                                        onClick={() => toggleTodo(todo.id)}
                                                        className="mt-0.5 text-emerald-600 hover:text-zinc-500 transition-colors"
                                                    >
                                                        <CheckSquare size={14} />
                                                    </button>
                                                    <span className="flex-1 text-sm text-zinc-500 line-through break-all leading-snug">
                                                        {todo.text}
                                                    </span>
                                                    <button
                                                        onClick={() => deleteTodo(todo.id)}
                                                        className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-opacity"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded overflow-hidden focus-within:border-zinc-700 transition-colors">
                            <input
                                value={todoInput}
                                onChange={(e) => setTodoInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                                placeholder="+ 添加新任务..."
                                className="flex-1 bg-transparent border-none px-3 py-2 text-sm text-zinc-200 focus:outline-none placeholder:text-zinc-700"
                                autoFocus
                            />
                            <div className="w-px h-5 bg-zinc-800 mx-1"></div>
                            <input
                                value={todoGroupInput}
                                onChange={(e) => setTodoGroupInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                                placeholder="Group"
                                className="w-20 bg-transparent border-none py-2 text-xs text-zinc-400 text-center focus:outline-none placeholder:text-zinc-700"
                            />
                        </div>
                    </div>
                )}

                {tab === 'progress' && (
                    <div className="h-full flex flex-col p-3">
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 mb-2 pl-2 pr-2">
                            {project.progressLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-zinc-700 gap-2">
                                    <Activity size={24} className="opacity-20" />
                                    <span className="text-xs">暂无进展记录</span>
                                </div>
                            ) : (
                                project.progressLogs.map((log) => (
                                    <div key={log.id} className="relative pl-6 group">
                                        <div className="absolute left-[5px] top-2 bottom-[-24px] w-px bg-zinc-800 group-last:bottom-auto group-last:h-full"></div>
                                        <div className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full bg-zinc-900 border-2 border-blue-500/50 group-hover:border-blue-400 transition-colors z-10"></div>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[10px] text-blue-400/80 font-mono font-medium leading-none mb-1 mt-1.5">
                                                {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="bg-zinc-800/30 border border-zinc-800/50 rounded-lg p-3 text-sm text-zinc-300 leading-relaxed shadow-sm group-hover:bg-zinc-800/50 group-hover:border-blue-500/20 transition-all">
                                                <MarkdownRenderer content={log.text} variant="goc" className="prose-sm" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <input
                            value={progressInput}
                            onChange={(e) => setProgressInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addProgress()}
                            placeholder="记录今天的进展..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700"
                        />
                    </div>
                )}

                {tab === 'memo' && (
                    <main
                        className="h-full flex flex-col relative"
                        onMouseEnter={() => setMemoView('edit')}
                        onMouseLeave={() => setMemoView('preview')}
                    >
                        {memoView === 'edit' ? (
                            <textarea
                                value={project.memo || ''}
                                onChange={(e) => saveMemo(e.target.value)}
                                className="flex-1 w-full bg-transparent p-4 text-sm font-mono text-zinc-300 resize-none outline-none custom-scrollbar"
                                placeholder="// Scratchpad..."
                                autoFocus
                            />
                        ) : (
                            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                                <MarkdownRenderer content={project.memo || '// Empty scratchpad'} variant="goc" className="prose-sm" />
                            </div>
                        )}
                    </main>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
            `}</style>
        </div>
    );
}
