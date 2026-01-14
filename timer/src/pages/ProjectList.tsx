import React, { useState, useEffect } from 'react';
import { X, Folder, Plus, Trash2, Check, ChevronRight, ChevronDown, Square, CheckSquare } from 'lucide-react';
import { Project, STORAGE_KEY_PROJECTS, STORAGE_KEY_LEGACY_TODOS } from '../lib/project-types';
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

// --- Sortable Item Component ---
function SortableProjectItem({
    project,
    openProjectWindow,
    deleteProject,
    onToggleStatus
}: {
    project: Project,
    openProjectWindow: (p: Project) => void,
    deleteProject: (id: string, e: React.MouseEvent) => void,
    onToggleStatus: (id: string, e: React.MouseEvent) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: isDragging ? 'relative' as const : undefined,
    };

    const activeCount = project.todos.filter(t => !t.completed).length;
    const isCompleted = project.status === 'completed';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => openProjectWindow(project)}
            className={`group flex items-center gap-3 px-4 py-2 border-b border-zinc-800/50 cursor-pointer transition-colors ${isDragging ? 'bg-zinc-800 shadow-xl opacity-80' : 'hover:bg-zinc-800'} ${isCompleted ? 'opacity-50' : ''}`}
        >
            <button
                onClick={(e) => onToggleStatus(project.id, e)}
                className={`p-1 -ml-1 rounded transition-colors ${isCompleted ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-600 hover:text-emerald-400 hover:bg-zinc-700'}`}
                title={isCompleted ? "恢复项目" : "归档项目"}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {isCompleted ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>

            <Folder size={14} className={`${isCompleted ? 'text-zinc-600' : 'text-zinc-500 group-hover:text-emerald-400'} shrink-0 transition-colors`} />

            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-300 group-hover:text-zinc-100'} truncate`}>
                        {project.name}
                    </span>
                    {!isCompleted && activeCount > 0 && (
                        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 px-1.5 rounded-full group-hover:bg-zinc-700 group-hover:text-zinc-300">
                            {activeCount}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => deleteProject(project.id, e)}
                    className="text-zinc-600 hover:text-red-400 p-1 hover:bg-zinc-700 rounded transition-colors"
                    title="删除项目"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}

function SortableProjectGroup({ group, projects, openProjectWindow, deleteProject, onToggleStatus }: {
    group: string,
    projects: Project[],
    openProjectWindow: (p: Project) => void,
    deleteProject: (id: string, e: React.MouseEvent) => void,
    onToggleStatus: (id: string, e: React.MouseEvent) => void
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
        <div ref={setNodeRef} style={style} className="mb-2">
            {group !== 'Ungrouped' && (
                <div
                    {...attributes}
                    {...listeners}
                    className={`flex items-center gap-2 mb-2 mt-4 px-3 sticky top-0 md:static z-10 bg-zinc-900/90 py-1 backdrop-blur-sm -mx-3 md:mx-0 md:bg-transparent md:backdrop-filter-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
                >
                    <div className="h-px bg-zinc-800 flex-1"></div>
                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest bg-zinc-900/50 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm shadow-emerald-900/10 hover:bg-zinc-800 transition-colors">
                        {group}
                    </span>
                    <div className="h-px bg-zinc-800 flex-1"></div>
                </div>
            )}
            <SortableContext
                items={projects.map(p => p.id)}
                strategy={verticalListSortingStrategy}
            >
                {projects.map(p => (
                    <SortableProjectItem
                        key={p.id}
                        project={p}
                        openProjectWindow={openProjectWindow}
                        deleteProject={deleteProject}
                        onToggleStatus={onToggleStatus}
                    />
                ))}
            </SortableContext>
        </div>
    );
}

export default function ProjectListPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [createName, setCreateName] = useState('');
    const [createGroup, setCreateGroup] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);

    // --- Initialization & Migration ---
    useEffect(() => {
        const loadProjects = () => {
            const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
            let loadedProjects: Project[] = [];

            if (savedProjects) {
                try {
                    loadedProjects = JSON.parse(savedProjects);
                } catch (e) {
                    console.error("Failed to parse projects", e);
                }
            }

            // Migration Check
            if (loadedProjects.length === 0) {
                const legacyTodosStr = localStorage.getItem(STORAGE_KEY_LEGACY_TODOS);
                if (legacyTodosStr) {
                    try {
                        const legacyTodos = JSON.parse(legacyTodosStr);
                        if (Array.isArray(legacyTodos) && legacyTodos.length > 0) {
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
                                })),
                                memo: ''
                            };
                            loadedProjects = [inboxProject];
                            localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(loadedProjects));
                        }
                    } catch (e) {
                        console.error("Migration failed", e);
                    }
                }
            }
            setProjects(loadedProjects);
        };

        loadProjects();

        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY_PROJECTS) {
                loadProjects();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const saveProjects = (newProjects: Project[]) => {
        setProjects(newProjects);
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(newProjects));
    };

    const handleCreate = () => {
        if (!createName.trim()) return;

        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: createName,
            description: '点击进入...',
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            progressLogs: [],
            todos: [],
            memo: '',
            group: createGroup.trim() || undefined
        };
        saveProjects([newProject, ...projects]);
        setCreateName('');
        setCreateGroup('');
        openProjectWindow(newProject);
    };

    const deleteProject = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('确定删除此项目吗？')) {
            saveProjects(projects.filter(p => p.id !== id));
        }
    };

    const toggleProjectStatus = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newProjects = projects.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    status: p.status === 'completed' ? 'active' as const : 'completed' as const,
                    updatedAt: Date.now()
                };
            }
            return p;
        });
        saveProjects(newProjects);
    };

    const openProjectWindow = (p: Project) => {
        // @ts-ignore
        window.electron?.send('open-project-window', { projectId: p.id, title: p.name });
    };

    // --- DnD Logic ---
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
        if (!over) return;

        if (active.id !== over.id) {
            setProjects((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                const projectsWithOrder = newItems.map((p, index) => ({ ...p, order: index }));
                localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projectsWithOrder));
                return projectsWithOrder;
            });
        }
    };

    // Grouping Logic
    const activeProjects = projects.filter(p => p.status !== 'completed');
    const completedProjects = projects.filter(p => p.status === 'completed');

    const groupedProjects = activeProjects.reduce((acc, project) => {
        const group = project.group || 'Ungrouped';
        if (!acc[group]) acc[group] = [];
        acc[group].push(project);
        return acc;
    }, {} as Record<string, Project[]>);

    const [projectGroupOrder, setProjectGroupOrder] = useState<string[]>([]);
    useEffect(() => {
        const savedOrder = localStorage.getItem('project-group-order-v1');
        if (savedOrder) {
            try {
                setProjectGroupOrder(JSON.parse(savedOrder));
            } catch (e) { console.error(e); }
        }
    }, []);

    const sortedGroups = Object.keys(groupedProjects).sort((a, b) => {
        if (projectGroupOrder.length > 0) {
            const indexA = projectGroupOrder.indexOf(a);
            const indexB = projectGroupOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
        }
        if (a === 'Ungrouped') return 1;
        if (b === 'Ungrouped') return -1;
        return a.localeCompare(b);
    });

    return (
        <div className="flex flex-col h-screen w-full bg-zinc-900 text-zinc-100 select-none overflow-hidden font-sans">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0" data-drag="true">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Projects</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.close()}
                        className="p-1 text-zinc-600 hover:text-white hover:bg-red-500/20 rounded transition-colors"
                        data-drag="false"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 flex flex-col">
                <div className="flex-1">
                    {activeProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-2">
                            <Folder size={24} />
                            <span className="text-xs">无进行中的项目</span>
                        </div>
                    ) : (
                        <div className="flex flex-col pb-2">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={sortedGroups} strategy={verticalListSortingStrategy}>
                                    {sortedGroups.map(group => (
                                        <SortableProjectGroup
                                            key={group}
                                            group={group}
                                            projects={groupedProjects[group]}
                                            openProjectWindow={openProjectWindow}
                                            deleteProject={deleteProject}
                                            onToggleStatus={toggleProjectStatus}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {/* Completed Projects Section */}
                    {completedProjects.length > 0 && (
                        <div className="mt-4 border-t border-zinc-800/50">
                            <button
                                onClick={() => setShowCompleted(!showCompleted)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                            >
                                <div className="flex items-center gap-2 text-zinc-500">
                                    {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    <span className="text-[10px] uppercase tracking-widest font-bold">已完成项目 ({completedProjects.length})</span>
                                </div>
                            </button>

                            {showCompleted && (
                                <div className="pb-4">
                                    {completedProjects.map(p => (
                                        <SortableProjectItem
                                            key={p.id}
                                            project={p}
                                            openProjectWindow={openProjectWindow}
                                            deleteProject={deleteProject}
                                            onToggleStatus={toggleProjectStatus}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Creation Input */}
                <div className="p-2 border-t border-zinc-800 bg-zinc-900 sticky bottom-0">
                    <div className="flex items-center bg-zinc-800/50 rounded-md border border-zinc-800 focus-within:border-zinc-700 transition-colors overflow-hidden">
                        <div className="pl-2 pr-1">
                            <Plus size={14} className="text-zinc-500" />
                        </div>
                        <input
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            className="bg-transparent border-none text-xs text-zinc-200 w-full py-1.5 focus:outline-none placeholder:text-zinc-600"
                            placeholder="New Project..."
                        />
                        <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                        <input
                            value={createGroup}
                            onChange={(e) => setCreateGroup(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            className="bg-transparent border-none text-[10px] text-zinc-400 w-16 py-1.5 focus:outline-none placeholder:text-zinc-600 text-center"
                            placeholder="Group"
                        />
                    </div>
                </div>

                <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
            </div>
        </div>
    );
}
