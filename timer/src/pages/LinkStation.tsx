import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Search,
    Layout,
    Check,
    X,
    Edit2
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

// --- Custom Components ---

const ContextMenu = ({ x, y, options, onClose }: { x: number, y: number, options: { label: string, onClick: () => void, icon?: any, danger?: boolean }[], onClose: () => void }) => {
    useEffect(() => {
        const handleClick = () => onClose();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [onClose]);

    return (
        <div
            className="fixed z-[100] bg-[#222] border border-[#333] rounded-lg shadow-2xl py-1 min-w-[120px] animate-in fade-in zoom-in duration-100"
            style={{ left: Math.min(x, window.innerWidth - 130), top: Math.min(y, window.innerHeight - 150) }}
            onClick={(e) => e.stopPropagation()}
        >
            {options.map((opt, i) => (
                <button
                    key={i}
                    onClick={() => { opt.onClick(); onClose(); }}
                    className={cn(
                        "w-full px-3 py-1.5 text-xs text-left hover:bg-[#333] transition-colors",
                        opt.danger ? "text-red-400" : "text-neutral-300"
                    )}
                >
                    {opt.label}
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
                    if (data.groups && data.groups.length > 0) {
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
        const newGroup: LinkGroup = { id: Date.now().toString(), name: newGroupName };
        setGroups([...groups, newGroup]);
        setActiveGroupId(newGroup.id);
        setNewGroupName('');
        setIsCreatingGroup(false);
    };

    const handleRenameGroup = (id: string, newName: string) => {
        if (!newName.trim()) return setEditingGroupId(null);
        setGroups(groups.map(g => g.id === id ? { ...g, name: newName } : g));
        setEditingGroupId(null);
    };

    const handleDeleteGroup = (id: string) => {
        if (!confirm('Delete folder?')) return;
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
            title: newSectionTitle,
            collapsed: false,
            createdAt: Date.now()
        };
        setSections([...sections, newSection]);
        setNewSectionTitle('');
        setIsAddingSection(false);
    };

    const handleRenameSection = (id: string, newTitle: string) => {
        if (!newTitle.trim()) return setEditingSectionId(null);
        setSections(sections.map(s => s.id === id ? { ...s, title: newTitle } : s));
        setEditingSectionId(null);
    };

    const handleAddLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLinkUrl) return;
        let finalUrl = newLinkUrl;
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
        if (!confirm("Delete section?")) return;
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

    const renderLinkCard = (link: LinkItem) => (
        <div
            key={link.id}
            onClick={() => window.electron.send('open-external-link', link.url)}
            className="group relative bg-[#1c1c1c] hover:bg-[#242424] border border-[#262626] hover:border-[#333] rounded-md p-2 transition-all cursor-pointer mb-1.5"
        >
            <div className="flex gap-2.5 items-center">
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <input
                        value={link.title}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleUpdateLink(link.id, { title: e.target.value })}
                        className="bg-transparent font-medium text-neutral-200 text-[13px] w-full focus:outline-none focus:bg-[#111] rounded px-0.5 truncate placeholder:text-neutral-700"
                        placeholder="Untitled"
                    />
                    <div className="h-3.5 mt-0.5">
                        <input
                            onClick={(e) => e.stopPropagation()}
                            placeholder={link.note ? "" : "Add note..."}
                            value={link.note || ''}
                            onChange={(e) => handleUpdateLink(link.id, { note: e.target.value })}
                            className={cn(
                                "bg-transparent text-[10px] w-full focus:outline-none focus:text-neutral-400 transition-all",
                                link.note ? "text-neutral-500" : "text-neutral-700 opacity-0 group-hover:opacity-100"
                            )}
                        />
                    </div>
                </div>

                {/* Actions Only on Hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <div className="relative p-1 hover:bg-[#333] rounded cursor-pointer transition-colors group/move">
                        <Edit2 size={12} className="text-neutral-600" />
                        <select
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            value={link.sectionId || ''}
                            onChange={(e) => handleMoveLinkToSection(link.id, e.target.value || undefined)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">Move...</option>
                            <option value="">(Inbox)</option>
                            {currentGroupSections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={(e) => handleDeleteLink(link.id, e)}
                        className="p-1 hover:text-red-400 text-neutral-600 transition-all font-bold text-xs"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#111] text-neutral-300 font-sans text-sm overflow-hidden select-none">

            {/* Sidebar (No Icons, Larger Font) */}
            <div className="w-24 flex-shrink-0 bg-[#0a0a0a] border-r border-[#222] flex flex-col no-drag">
                <div className="p-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Groups</span>
                    <button onClick={() => setIsCreatingGroup(true)} className="hover:text-white transition-colors">
                        <Plus size={12} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
                    {/* Fixed Inbox */}
                    <button
                        onClick={() => setActiveGroupId('default')}
                        className={cn(
                            "w-full px-2 py-1.5 rounded transition-all text-left text-[14px]",
                            activeGroupId === 'default' ? "bg-[#222] text-white font-medium" : "hover:bg-[#151515] text-neutral-500"
                        )}
                    >
                        Inbox
                    </button>

                    <div className="my-1 border-t border-[#222] opacity-30 mx-2" />

                    {/* Group List */}
                    {groups.map(group => {
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
                                            { label: 'Rename', onClick: () => setEditingGroupId(group.id) },
                                            { label: 'Delete', danger: true, onClick: () => handleDeleteGroup(group.id) }
                                        ]
                                    });
                                }}
                                onClick={() => setActiveGroupId(group.id)}
                                className={cn(
                                    "w-full px-2 py-1.5 rounded transition-all cursor-pointer mb-0.5 text-[14px]",
                                    activeGroupId === group.id ? "bg-[#222] text-white font-medium" : "hover:bg-[#151515] text-neutral-500"
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
                        <div className="px-2 py-1">
                            <input
                                autoFocus
                                className="w-full bg-[#111] text-xs text-white rounded px-1.5 py-1 focus:outline-none border border-[#333]"
                                placeholder="..."
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
            <div className="flex-1 flex flex-col h-full bg-[#111]">
                {/* Header (Drag Region) */}
                <div className="h-10 border-b border-[#222] flex items-center px-3 justify-between drag-region">
                    <div className="flex items-center gap-2 no-drag min-w-0">
                        <span className="font-bold text-neutral-100 text-xs truncate">{activeGroup?.name || 'Search'}</span>
                    </div>

                    <div className="flex-1 h-full" />

                    <div className="flex items-center gap-2 no-drag">
                        {!searchQuery && (
                            <button onClick={() => setIsAddingSection(true)} className="text-neutral-600 hover:text-neutral-200">
                                <Layout size={14} />
                            </button>
                        )}
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find..."
                            className="w-20 bg-transparent border border-[#222] rounded px-2 py-0.5 text-[10px] focus:outline-none focus:border-neutral-700 transition-colors"
                        />
                        <button onClick={() => window.close()} className="hover:text-white text-neutral-600 transition-colors px-1">
                            ×
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Inline Section Add */}
                    {isAddingSection && (
                        <div className="px-3 pt-2">
                            <form onSubmit={handleConfirmAddSection} className="flex items-center gap-2 bg-[#1a1a1a] p-1.5 rounded border border-[#222]">
                                <input
                                    autoFocus
                                    value={newSectionTitle}
                                    onChange={(e) => setNewSectionTitle(e.target.value)}
                                    placeholder="Section name..."
                                    className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                                />
                                <button type="submit" className="text-blue-500 hover:text-blue-400 px-1 text-xs">OK</button>
                            </form>
                        </div>
                    )}

                    {/* Quick Add Link */}
                    <div className="p-3 pb-1">
                        <form onSubmit={handleAddLink} className="relative group/input">
                            <input
                                type="text"
                                placeholder="Paste URL..."
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                className="w-full bg-[#181818] border border-[#222] rounded px-3 py-2 text-[11px] text-neutral-200 focus:outline-none focus:border-[#333] transition-all placeholder:text-neutral-800"
                            />
                        </form>
                    </div>

                    {/* Links List */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar">
                        <div className="pt-1">
                            {displayLinks.filter(l => searchQuery || !l.sectionId).map(renderLinkCard)}
                        </div>

                        {!searchQuery && currentGroupSections.map(section => {
                            const sectionLinks = currentGroupLinks.filter(l => l.sectionId === section.id);
                            const isEditing = editingSectionId === section.id;

                            return (
                                <div key={section.id} className="mt-4">
                                    <div
                                        className="flex items-center gap-2 mb-1.5 cursor-pointer group px-0.5"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                options: [
                                                    { label: 'Rename', onClick: () => setEditingSectionId(section.id) },
                                                    { label: 'Delete', danger: true, onClick: () => handleDeleteSection(section.id) }
                                                ]
                                            });
                                        }}
                                    >
                                        <div className="flex items-center gap-1.5 flex-1" onClick={() => handleToggleSection(section.id)}>
                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    className="bg-[#222] text-[10px] font-bold text-white px-1 rounded focus:outline-none"
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
                                                    "text-[10px] font-bold uppercase tracking-widest transition-colors",
                                                    section.collapsed ? "text-neutral-700" : "text-neutral-600"
                                                )}>
                                                    {section.title}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 border-t border-[#1a1a1a]" />
                                    </div>

                                    {!section.collapsed && (
                                        <div className="pl-1 border-l border-[#1a1a1a] ml-1 space-y-0.5">
                                            {sectionLinks.map(renderLinkCard)}
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
                .custom-scrollbar::-webkit-scrollbar { width: 2px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; }
                .drag-region { -webkit-app-region: drag; }
                .no-drag { -webkit-app-region: no-drag; }
            `}</style>
        </div>
    );
}
