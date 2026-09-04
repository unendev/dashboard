import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Search,
    Layout,
    ChevronDown,
    ChevronRight,
    Edit2,
    FolderInput,
    ExternalLink
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---

interface LinkGroup {
    id: string;
    name: string;
}

interface LinkSection {
    id: string;
    groupId: string;
    title: string;
    collapsed: boolean;
    createdAt: number;
}

interface LinkItem {
    id: string;
    groupId: string;
    sectionId?: string;
    url: string;
    title: string;
    domain: string;
    note?: string;
    createdAt: number;
}

const getDomainFromUrl = (url: string) => {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace('www.', '');
    } catch {
        return 'unknown';
    }
};

const guessTitleFromUrl = (url: string) => {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
            const last = segments[segments.length - 1];
            return decodeURIComponent(last.replace(/[-_]/g, ' '));
        }
        return new URL(url).hostname;
    } catch {
        return 'New Link';
    }
};

// --- Dark Context Menu ---

const ContextMenu = ({ x, y, options, onClose }: { x: number, y: number, options: { label: string, onClick: () => void, icon?: any, danger?: boolean }[], onClose: () => void }) => {
    useEffect(() => {
        const handleClick = () => onClose();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [onClose]);

    return (
        <div
            className="fixed z-[100] bg-[#1a1a1c] border border-zinc-700/60 rounded-lg shadow-2xl py-1 min-w-[140px] animate-in fade-in zoom-in duration-100 backdrop-blur-md"
            style={{ left: Math.min(x, window.innerWidth - 150), top: Math.min(y, window.innerHeight - 180) }}
            onClick={(e) => e.stopPropagation()}
        >
            {options.map((opt, i) => (
                <button
                    key={i}
                    onClick={() => { opt.onClick(); onClose(); }}
                    className={cn(
                        "w-full px-3 py-1.5 text-xs text-left hover:bg-zinc-800 transition-colors flex items-center gap-1.5",
                        opt.danger ? "text-red-400 hover:text-red-300" : "text-zinc-300 hover:text-white"
                    )}
                >
                    {opt.icon && <opt.icon size={12} className="shrink-0 opacity-70" />}
                    <span className="truncate">{opt.label}</span>
                </button>
            ))}
        </div>
    );
};

// --- Main Component ---

export default function LinkStation() {
    const [groups, setGroups] = useState<LinkGroup[]>([]);
    const [sections, setSections] = useState<LinkSection[]>([]);
    const [links, setLinks] = useState<LinkItem[]>([]);

    const [activeGroupId, setActiveGroupId] = useState<string>('default');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);

    // Interaction States
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, options: any[] } | null>(null);

    const saveTimeoutRef = useRef<any>(null);

    // Load Data
    useEffect(() => {
        const load = async () => {
            try {
                const data = await window.electron.invoke('get-links-data');
                if (data) {
                    setGroups(data.groups || []);
                    setLinks(data.links || []);
                    setSections(data.sections || []);
                    const performanceGroup = data.groups?.find((g: LinkGroup) => g.name === '演出');
                    if (performanceGroup) {
                        setActiveGroupId(performanceGroup.id);
                    } else if (data.groups && data.groups.length > 0) {
                        setActiveGroupId(data.groups[0].id);
                    }
                }
            } catch (e) {
                console.error('Failed to load data', e);
            } finally {
                setIsLoaded(true);
            }
        };
        load();
    }, []);

    // Save Data
    useEffect(() => {
        if (!isLoaded) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            window.electron.send('save-links-data', { groups, links, sections });
        }, 1000);
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [groups, links, sections, isLoaded]);

    const handleConfirmAddGroup = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newGroupName.trim()) {
            setIsCreatingGroup(false);
            return;
        }
        const newGroup: LinkGroup = { id: Date.now().toString(), name: newGroupName.trim() };
        setGroups([...groups, newGroup]);
        setActiveGroupId(newGroup.id);
        setNewGroupName('');
        setIsCreatingGroup(false);
    };

    const handleRenameGroup = (id: string, newName: string) => {
        if (!newName.trim()) return setEditingGroupId(null);
        setGroups(groups.map(g => g.id === id ? { ...g, name: newName.trim() } : g));
        setEditingGroupId(null);
    };

    const handleDeleteGroup = (id: string) => {
        if (!confirm('确定删除该分组吗？')) return;
        setGroups(groups.filter(g => g.id !== id));
        setLinks(links.filter(l => l.groupId !== id));
        setSections(sections.filter(s => s.groupId !== id));
        if (activeGroupId === id && groups.length > 0) setActiveGroupId(groups[0].id);
    };

    const handleConfirmAddSection = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newSectionTitle.trim()) return setIsAddingSection(false);
        const newSection: LinkSection = {
            id: Date.now().toString(),
            groupId: activeGroupId,
            title: newSectionTitle.trim(),
            collapsed: false,
            createdAt: Date.now()
        };
        setSections([...sections, newSection]);
        setNewSectionTitle('');
        setIsAddingSection(false);
    };

    const handleRenameSection = (id: string, newTitle: string) => {
        if (!newTitle.trim()) return setEditingSectionId(null);
        setSections(sections.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
        setEditingSectionId(null);
    };

    const handleAddLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLinkUrl.trim()) return;
        let finalUrl = newLinkUrl.trim();
        if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
        const newLink: LinkItem = {
            id: Date.now().toString(),
            groupId: activeGroupId,
            url: finalUrl,
            title: guessTitleFromUrl(finalUrl),
            domain: getDomainFromUrl(finalUrl),
            createdAt: Date.now()
        };
        setLinks([newLink, ...links]);
        setNewLinkUrl('');
    };

    const handleMoveLinkToSection = (linkId: string, sectionId?: string) => {
        setLinks(links.map(l => l.id === linkId ? { ...l, sectionId } : l));
    };

    const handleDeleteLink = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setLinks(links.filter(l => l.id !== id));
    };

    const handleUpdateLink = (id: string, updates: Partial<LinkItem>) => {
        setLinks(links.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const handleToggleSection = (id: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s));
    };

    const handleDeleteSection = (id: string) => {
        if (!confirm("确定删除该分类吗？分类下的链接将移至未分类")) return;
        setSections(sections.filter(s => s.id !== id));
        setLinks(links.map(l => l.sectionId === id ? { ...l, sectionId: undefined } : l));
    };

    // Filter Logic
    const activeGroup = groups.find(g => g.id === activeGroupId);
    const currentGroupLinks = links.filter(l => l.groupId === activeGroupId);
    const currentGroupSections = sections.filter(s => s.groupId === activeGroupId).sort((a, b) => a.createdAt - b.createdAt);

    const displayLinks = searchQuery
        ? links.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.includes(searchQuery))
        : currentGroupLinks;

    // 渲染卡片：双列紧凑卡片，暗黑移动气泡，无备注时不占多余空行
    const renderLinkCard = (link: LinkItem) => (
        <div
            key={link.id}
            onClick={() => window.electron.send('open-external-link', link.url)}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    options: [
                        {
                            label: link.note ? '修改备注' : '添加备注',
                            icon: Edit2,
                            onClick: () => {
                                const val = prompt('输入备注信息:', link.note || '');
                                if (val !== null) handleUpdateLink(link.id, { note: val.trim() });
                            }
                        },
                        { label: '移至 (未分类)', icon: FolderInput, onClick: () => handleMoveLinkToSection(link.id, undefined) },
                        ...currentGroupSections.map(s => ({
                            label: `移至 ${s.title}`,
                            icon: FolderInput,
                            onClick: () => handleMoveLinkToSection(link.id, s.id)
                        })),
                        { label: '删除链接', danger: true, onClick: () => handleDeleteLink(link.id, e) }
                    ]
                });
            }}
            className="group relative bg-[#1c1c1f] hover:bg-[#26262b] border border-zinc-800/80 hover:border-zinc-700 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-center"
            title={`点击在浏览器打开: ${link.url}`}
        >
            <div className="flex items-center justify-between gap-1.5 w-full">
                <input
                    value={link.title}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleUpdateLink(link.id, { title: e.target.value })}
                    className="bg-transparent font-medium text-zinc-200 text-xs w-full focus:outline-none focus:bg-[#111] rounded px-0.5 truncate placeholder:text-zinc-600"
                    placeholder="Untitled"
                />

                {/* 悬浮操作按钮 */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setContextMenu({
                                x: rect.left,
                                y: rect.bottom + 4,
                                options: [
                                    {
                                        label: link.note ? '修改备注' : '添加备注',
                                        icon: Edit2,
                                        onClick: () => {
                                            const val = prompt('输入备注信息:', link.note || '');
                                            if (val !== null) handleUpdateLink(link.id, { note: val.trim() });
                                        }
                                    },
                                    { label: '移至 (未分类)', icon: FolderInput, onClick: () => handleMoveLinkToSection(link.id, undefined) },
                                    ...currentGroupSections.map(s => ({
                                        label: `移至 ${s.title}`,
                                        icon: FolderInput,
                                        onClick: () => handleMoveLinkToSection(link.id, s.id)
                                    })),
                                    { label: '删除链接', danger: true, onClick: () => handleDeleteLink(link.id, e) }
                                ]
                            });
                        }}
                        className="p-1 hover:bg-zinc-700/60 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="移动分类 / 备注"
                    >
                        <Edit2 size={11} />
                    </button>
                    <button
                        onClick={(e) => handleDeleteLink(link.id, e)}
                        className="p-1 hover:bg-red-500/20 rounded text-zinc-500 hover:text-red-400 transition-colors font-bold text-xs"
                        title="删除链接"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* 仅在存在备注时才渲染备注行，绝不占用多余高度 */}
            {link.note && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        const val = prompt('修改备注:', link.note || '');
                        if (val !== null) handleUpdateLink(link.id, { note: val.trim() });
                    }}
                    className="mt-0.5 text-[10px] text-zinc-500 truncate hover:text-zinc-300 transition-colors cursor-text"
                    title={`备注: ${link.note} (点击可修改)`}
                >
                    {link.note}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex h-screen bg-[#111113] text-zinc-300 font-sans text-sm overflow-hidden select-none">

            {/* Sidebar */}
            <div className="w-28 flex-shrink-0 bg-[#0c0c0e] border-r border-zinc-800/80 flex flex-col no-drag">
                <div className="p-3 py-2.5 flex items-center justify-between border-b border-zinc-800/40">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Groups</span>
                    <button onClick={() => setIsCreatingGroup(true)} className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded hover:bg-zinc-800">
                        <Plus size={13} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar">
                    {/* Fixed Inbox */}
                    <button
                        onClick={() => setActiveGroupId('default')}
                        className={cn(
                            "w-full px-2 py-1.5 rounded-md transition-all text-left text-[13px] font-medium",
                            activeGroupId === 'default' ? "bg-[#222227] text-white shadow-sm" : "hover:bg-[#18181c] text-zinc-400"
                        )}
                    >
                        Inbox
                    </button>

                    <div className="my-1.5 border-t border-zinc-800/60 mx-1" />

                    {/* Group List */}
                    {[...groups].sort((a, b) => {
                        const priority = (name: string) => {
                            if (name === '演出') return 0;
                            if (name === '情报') return 1;
                            return 2;
                        };
                        return priority(a.name) - priority(b.name);
                    }).map(group => {
                        if (group.id === 'default') return null;
                        const isEditing = editingGroupId === group.id;

                        return (
                            <div
                                key={group.id}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({
                                        x: e.clientX,
                                        y: e.clientY,
                                        options: [
                                            { label: '重命名', onClick: () => setEditingGroupId(group.id) },
                                            { label: '删除分组', danger: true, onClick: () => handleDeleteGroup(group.id) }
                                        ]
                                    });
                                }}
                                onClick={() => setActiveGroupId(group.id)}
                                className={cn(
                                    "w-full px-2 py-1.5 rounded-md transition-all cursor-pointer mb-0.5 text-[13px] font-medium",
                                    activeGroupId === group.id ? "bg-[#222227] text-white shadow-sm" : "hover:bg-[#18181c] text-zinc-400"
                                )}
                            >
                                {isEditing ? (
                                    <input
                                        autoFocus
                                        className="w-full bg-transparent text-white focus:outline-none"
                                        defaultValue={group.name}
                                        onBlur={(e) => handleRenameGroup(group.id, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleRenameGroup(group.id, e.currentTarget.value);
                                            if (e.key === 'Escape') setEditingGroupId(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="truncate block">{group.name}</span>
                                )}
                            </div>
                        );
                    })}

                    {isCreatingGroup && (
                        <div className="px-1 py-1">
                            <input
                                autoFocus
                                className="w-full bg-[#18181c] text-xs text-white rounded px-2 py-1 focus:outline-none border border-zinc-700"
                                placeholder="分组名..."
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleConfirmAddGroup();
                                    if (e.key === 'Escape') setIsCreatingGroup(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full bg-[#111113]">
                {/* Header (Drag Region) */}
                <div className="h-10 border-b border-zinc-800/80 flex items-center px-3 justify-between drag-region shrink-0">
                    <div className="flex items-center gap-2 no-drag min-w-0">
                        <span className="font-bold text-white text-xs truncate">{activeGroup?.name || '搜索'}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">({displayLinks.length})</span>
                    </div>

                    <div className="flex-1 h-full" />

                    <div className="flex items-center gap-2 no-drag">
                        {!searchQuery && (
                            <button
                                onClick={() => setIsAddingSection(true)}
                                className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
                                title="添加新分类"
                            >
                                <Layout size={13} />
                            </button>
                        )}
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="查找..."
                            className="w-24 bg-[#18181c] border border-zinc-800 rounded px-2 py-0.5 text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-700 transition-colors"
                        />
                        <button onClick={() => window.close()} className="hover:text-white text-zinc-500 transition-colors px-1 text-base leading-none">
                            ×
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Inline Section Add */}
                    {isAddingSection && (
                        <div className="px-3 pt-2">
                            <form onSubmit={handleConfirmAddSection} className="flex items-center gap-2 bg-[#1a1a1c] p-1.5 rounded-lg border border-zinc-700/60">
                                <input
                                    autoFocus
                                    value={newSectionTitle}
                                    onChange={(e) => setNewSectionTitle(e.target.value)}
                                    placeholder="分类名称 (如: VTUBER, AVG, 攻略)..."
                                    className="flex-1 bg-transparent text-xs text-white focus:outline-none px-1"
                                />
                                <button type="submit" className="text-purple-400 hover:text-purple-300 font-medium px-2 text-xs">确认</button>
                                <button type="button" onClick={() => setIsAddingSection(false)} className="text-zinc-500 hover:text-zinc-300 px-1 text-xs">取消</button>
                            </form>
                        </div>
                    )}

                    {/* Quick Add Link */}
                    <div className="p-3 pb-2 shrink-0">
                        <form onSubmit={handleAddLink} className="relative group/input">
                            <input
                                type="text"
                                placeholder="粘贴链接或频道网址 (按回车秒级添加)..."
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                className="w-full bg-[#18181c] border border-zinc-800/90 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-600"
                            />
                        </form>
                    </div>

                    {/* Links List - 双列紧凑网格布局 */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-3">
                        {/* 未分类链接 (如果有) */}
                        {(() => {
                            const unclassified = displayLinks.filter(l => searchQuery || !l.sectionId);
                            if (unclassified.length === 0) return null;
                            return (
                                <div>
                                    {!searchQuery && currentGroupSections.length > 0 && (
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 px-0.5">
                                            未分类 ({unclassified.length})
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {unclassified.map(renderLinkCard)}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 各分类下的链接（支持折叠/展开） */}
                        {!searchQuery && currentGroupSections.map(section => {
                            const sectionLinks = currentGroupLinks.filter(l => l.sectionId === section.id);
                            const isEditing = editingSectionId === section.id;

                            return (
                                <div key={section.id} className="pt-1">
                                    {/* 分类标题栏 */}
                                    <div
                                        className="flex items-center gap-1.5 mb-1.5 cursor-pointer group px-0.5 select-none"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                options: [
                                                    { label: '重命名分类', onClick: () => setEditingSectionId(section.id) },
                                                    { label: '删除分类', danger: true, onClick: () => handleDeleteSection(section.id) }
                                                ]
                                            });
                                        }}
                                    >
                                        <div className="flex items-center gap-1.5 flex-1" onClick={() => handleToggleSection(section.id)}>
                                            {section.collapsed ? (
                                                <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                            ) : (
                                                <ChevronDown size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                            )}

                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    className="bg-[#222] text-[11px] font-bold text-white px-1.5 py-0.5 rounded focus:outline-none"
                                                    defaultValue={section.title}
                                                    onBlur={(e) => handleRenameSection(section.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleRenameSection(section.id, e.currentTarget.value);
                                                        if (e.key === 'Escape') setEditingSectionId(null);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className={cn(
                                                    "text-[11px] font-bold uppercase tracking-wider transition-colors",
                                                    section.collapsed ? "text-zinc-600 group-hover:text-zinc-400" : "text-zinc-400 group-hover:text-zinc-200"
                                                )}>
                                                    {section.title}
                                                    <span className="text-[10px] text-zinc-600 font-mono font-normal ml-1">({sectionLinks.length})</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 border-t border-zinc-800/40" />
                                    </div>

                                    {/* 分类内容：双列网格 */}
                                    {!section.collapsed && (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {sectionLinks.length > 0 ? (
                                                sectionLinks.map(renderLinkCard)
                                            ) : (
                                                <div className="col-span-2 text-center text-zinc-600 text-[11px] py-2 bg-[#161618]/40 rounded border border-dashed border-zinc-800/60">
                                                    暂无链接，右侧悬浮可将链接移入
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Context Menu Portal */}
            {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #26262a; border-radius: 4px; }
                .drag-region { -webkit-app-region: drag; }
                .no-drag { -webkit-app-region: no-drag; }
            `}</style>
        </div>
    );
}
