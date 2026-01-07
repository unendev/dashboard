import React, { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, Plus, ArrowLeft, MoreHorizontal, Calendar, CheckSquare, Square, Trash2 } from 'lucide-react';

// --- Types ---
interface TodoItem {
    id: string;
    text: string;
    completed: boolean; // 0 or 1 in legacy, boolean here? Let's stick to boolean for new, handle compat
    createdAt: string;
}

interface Project {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'completed' | 'archived';
    createdAt: number;
    updatedAt: number;
    progressLogs: { id: string; text: string; createdAt: number }[];
    todos: TodoItem[];
}

const STORAGE_KEY_PROJECTS = 'projects-v1';
const STORAGE_KEY_LEGACY_TODOS = 'todo-items-v1';

// --- Components ---

export default function ProjectPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    // --- Initialization & Migration ---
    useEffect(() => {
        const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
        let loadedProjects: Project[] = [];

        if (savedProjects) {
            try {
                loadedProjects = JSON.parse(savedProjects);
            } catch (e) {
                console.error("Failed to parse projects", e);
            }
        }

        // Migration Check: If no projects but legacy todos exist
        if (loadedProjects.length === 0) {
            const legacyTodosStr = localStorage.getItem(STORAGE_KEY_LEGACY_TODOS);
            if (legacyTodosStr) {
                try {
                    const legacyTodos = JSON.parse(legacyTodosStr);
                    if (Array.isArray(legacyTodos) && legacyTodos.length > 0) {
                        // Create default inbox project
                        const inboxProject: Project = {
                            id: 'project-inbox',
                            name: '默认项目 (Inbox)',
                            description: 'Migrated from legacy todos',
                            status: 'active',
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            progressLogs: [],
                            todos: legacyTodos.map((t: any) => ({
                                id: t.id,
                                text: t.text,
                                completed: !!t.completed,
                                createdAt: t.createdAt || new Date().toISOString()
                            }))
                        };
                        loadedProjects = [inboxProject];
                        // Start with migration changes saved specifically to projects only? 
                        // Or keep legacy sync? Let's just migrate forward.
                        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(loadedProjects));
                    }
                } catch (e) {
                    console.error("Migration failed", e);
                }
            }
        }

        setProjects(loadedProjects);
    }, []);

    // --- Persistence ---
    const saveProjects = (newProjects: Project[]) => {
        setProjects(newProjects);
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(newProjects));
    };

    const activeProject = projects.find(p => p.id === activeProjectId);

    // --- Handlers: Project List ---
    const createProject = () => {
        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: '新项目',
            description: '点击编辑目标...',
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            progressLogs: [],
            todos: []
        };
        saveProjects([newProject, ...projects]);
        setActiveProjectId(newProject.id);
        setView('detail');
    };

    const deleteProject = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('确定删除此项目吗？')) {
            saveProjects(projects.filter(p => p.id !== id));
            if (activeProjectId === id) {
                setView('list');
                setActiveProjectId(null);
            }
        }
    };

    // --- Handlers: Detail (Project) ---
    const updateProject = (id: string, updates: Partial<Project>) => {
        const newProjects = projects.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
        );
        saveProjects(newProjects);
    };

    // --- Handlers: Detail (Todos) ---
    const toggleTodo = (projectId: string, todoId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newTodos = project.todos.map(t =>
            t.id === todoId ? { ...t, completed: !t.completed } : t
        );
        updateProject(projectId, { todos: newTodos });
    };

    const deleteTodo = (projectId: string, todoId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newTodos = project.todos.filter(t => t.id !== todoId);
        updateProject(projectId, { todos: newTodos });
    };

    const addTodo = (projectId: string, text: string) => {
        if (!text.trim()) return;
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newTodo: TodoItem = {
            id: `todo-${Date.now()}`,
            text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        updateProject(projectId, { todos: [...project.todos, newTodo] });
    };

    // --- Handlers: Progress Logs ---
    const addProgress = (projectId: string, text: string) => {
        if (!text.trim()) return;
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newLog = {
            id: `log-${Date.now()}`,
            text,
            createdAt: Date.now()
        };
        updateProject(projectId, { progressLogs: [newLog, ...project.progressLogs] });
    };

    const deleteProgress = (projectId: string, logId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        const newLogs = project.progressLogs.filter(l => l.id !== logId);
        updateProject(projectId, { progressLogs: newLogs });
    }

    // --- Sub-components ---

    const ProjectCard = ({ project }: { project: Project }) => (
        <div
            onClick={() => { setActiveProjectId(project.id); setView('detail'); }}
            className="bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-500 rounded p-3 cursor-pointer group transition-all"
        >
            <div className="flex items-center justify-between mb-2">
                <Folder size={14} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                <button
                    onClick={(e) => deleteProject(project.id, e)}
                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 size={12} />
                </button>
            </div>
            <h3 className="text-sm font-medium text-zinc-200 truncate">{project.name}</h3>
            <p className="text-[10px] text-zinc-500 mt-1 truncate">{project.description}</p>

            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <CheckSquare size={10} />
                    <span>{project.todos.filter(t => t.completed).length}/{project.todos.length}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 ml-auto">
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );

    const ProjectDetail = ({ project }: { project: Project }) => {
        const [todoInput, setTodoInput] = useState('');
        const [progressInput, setProgressInput] = useState('');
        const [isEditingName, setIsEditingName] = useState(false);
        const [isEditingDesc, setIsEditingDesc] = useState(false);

        return (
            <div className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="flex items-start gap-2 p-3 bg-zinc-800/80 border-b border-zinc-700/50 shrink-0">
                    <button
                        onClick={() => { setView('list'); setActiveProjectId(null); }}
                        className="mt-1 p-1 -ml-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-700/50 transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </button>

                    <div className="flex-1 min-w-0">
                        {isEditingName ? (
                            <input
                                className="w-full bg-black/20 border border-zinc-600 rounded px-1.5 py-0.5 text-sm font-medium text-zinc-100 focus:outline-none"
                                value={project.name}
                                onChange={(e) => updateProject(project.id, { name: e.target.value })}
                                onBlur={() => setIsEditingName(false)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                            />
                        ) : (
                            <h2
                                className="text-sm font-bold text-zinc-100 truncate cursor-text hover:text-emerald-300 transition-colors"
                                onClick={() => setIsEditingName(true)}
                            >
                                {project.name}
                            </h2>
                        )}

                        {isEditingDesc ? (
                            <input
                                className="w-full mt-1 bg-black/20 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-zinc-400 focus:outline-none"
                                value={project.description}
                                onChange={(e) => updateProject(project.id, { description: e.target.value })}
                                onBlur={() => setIsEditingDesc(false)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingDesc(false)}
                            />
                        ) : (
                            <p
                                className="text-xs text-zinc-500 truncate cursor-text hover:text-zinc-300 transition-colors mt-0.5"
                                onClick={() => setIsEditingDesc(true)}
                            >
                                {project.description || '无描述'}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                    {/* Progress Section */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar size={10} />
                                进展追踪
                            </h3>
                        </div>

                        <div className="space-y-2 mb-2">
                            {project.progressLogs.length === 0 && (
                                <div className="text-[10px] text-zinc-600 italic px-1">暂无进展记录</div>
                            )}
                            {project.progressLogs.slice(0, 3).map(log => (
                                <div key={log.id} className="text-xs text-zinc-300 pl-2 border-l-2 border-zinc-700 py-0.5 relative group">
                                    <span className="text-zinc-500 text-[10px] mr-2">{new Date(log.createdAt).toLocaleDateString()}</span>
                                    {log.text}
                                    <button
                                        onClick={() => deleteProgress(project.id, log.id)}
                                        className="absolute right-0 top-0.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 p-0.5"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <input
                            value={progressInput}
                            onChange={(e) => setProgressInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    addProgress(project.id, progressInput);
                                    setProgressInput('');
                                }
                            }}
                            placeholder="+ 记录新进展..."
                            className="w-full bg-zinc-800/30 border border-zinc-700/50 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700"
                        />
                    </section>

                    {/* Todos Section */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckSquare size={10} />
                                待办清单 ({project.todos.filter(t => !t.completed).length})
                            </h3>
                        </div>

                        <div className="space-y-1 mb-2">
                            {project.todos.length === 0 && (
                                <div className="text-[10px] text-zinc-600 italic px-1">暂无待办事项</div>
                            )}
                            {project.todos.map(todo => (
                                <div
                                    key={todo.id}
                                    className="group flex items-start gap-2 p-1.5 rounded hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        // IPC call to open task memo
                                        // @ts-ignore
                                        window.electron?.send('open-task-memo-window', { taskId: todo.id, taskName: todo.text });
                                    }}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleTodo(project.id, todo.id); }}
                                        className={`mt-0.5 shrink-0 transition-colors ${todo.completed ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                                    >
                                        {todo.completed ? <CheckSquare size={14} /> : <Square size={14} />}
                                    </button>
                                    <span
                                        className={`flex-1 text-sm leading-snug break-all ${todo.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}
                                    >
                                        {todo.text}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteTodo(project.id, todo.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity p-0.5 shrink-0"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <input
                            value={todoInput}
                            onChange={(e) => setTodoInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    addTodo(project.id, todoInput);
                                    setTodoInput('');
                                }
                            }}
                            placeholder="+ 添加待办..."
                            className="w-full bg-zinc-800/30 border border-zinc-700/50 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700"
                        />
                    </section>
                </div>
            </div>
        );
    };

    // --- Main Render ---
    return (
        <div className="flex flex-col h-screen w-full bg-zinc-900 text-zinc-100 select-none overflow-hidden font-sans">
            {/* Top Bar - Only on List View or if needed. Actually title bar is handled by OS frame? No, frame=false */}
            {view === 'list' && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0" data-drag="true">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Projects</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={createProject}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                            data-drag="false"
                            title="New Project"
                        >
                            <Plus size={14} />
                        </button>
                        <button
                            onClick={() => window.close()}
                            className="p-1 text-zinc-600 hover:text-white hover:bg-red-500/20 rounded transition-colors"
                            data-drag="false"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
                {view === 'list' ? (
                    <div className="h-full overflow-y-auto custom-scrollbar p-3 grid grid-cols-1 gap-2">
                        {projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-2">
                                <Folder size={24} />
                                <span className="text-xs">无项目</span>
                            </div>
                        ) : (
                            projects.map(p => <ProjectCard key={p.id} project={p} />)
                        )}
                    </div>
                ) : (
                    activeProject && <ProjectDetail project={activeProject} />
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
