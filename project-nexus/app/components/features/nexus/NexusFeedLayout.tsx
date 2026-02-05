'use client';

import React, { useEffect, useState } from 'react';
import { FeedItem, RSS_FEEDS } from '@/lib/rss-config'; // Import config directly for UI structure
import { FeedCard } from './FeedCard';

export default function NexusFeedLayout() {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'frontier' | 'culture' | 'wool'>('all');
    // Date State
    const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
    // Fold/Unfold State for Parent Items
    const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
    // Theme State: 'oled' (Pure Black), 'dim' (Zinc-900), 'light' (Zinc-50), 'treasure' (GitHub Dark)
    const [viewMode, setViewMode] = useState<'oled' | 'dim' | 'light' | 'treasure'>('treasure');
    const [showSettings, setShowSettings] = useState(false);

    // Source Toggle State
    const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>({});

    // Initialize sources from localStorage or config
    useEffect(() => {
        const saved = localStorage.getItem('nexus_enabled_sources');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with current config to handle new sources
                const initialSources: Record<string, boolean> = {};
                RSS_FEEDS.forEach(feed => {
                    if (feed.key in parsed) {
                        initialSources[feed.key] = parsed[feed.key];
                    } else {
                        initialSources[feed.key] = feed.enabled;
                    }
                });
                setEnabledSources(initialSources);
                return;
            } catch (e) {
                console.error('Failed to parse saved sources', e);
            }
        }

        // Fallback to default config
        const initialSources: Record<string, boolean> = {};
        RSS_FEEDS.forEach(feed => {
            initialSources[feed.key] = feed.enabled;
        });
        setEnabledSources(initialSources);
    }, []);

    const toggleSource = (key: string, checked: boolean) => {
        setEnabledSources(prev => {
            const next = { ...prev, [key]: checked };
            const config = RSS_FEEDS.find(f => f.key === key);
            if (config?.isParent) {
                const children = RSS_FEEDS.filter(f => f.parentId === key);
                children.forEach(child => next[child.key] = checked);
            }
            localStorage.setItem('nexus_enabled_sources', JSON.stringify(next));
            return next;
        });
    };

    useEffect(() => {
        async function loadFeeds() {
            try {
                const res = await fetch('/api/feeds');
                const data = await res.json();
                if (data.success) {
                    setItems(data.items);
                }
            } catch (err) {
                console.error('Initial feed load failed', err);
            } finally {
                setLoading(false);
            }
        }
        loadFeeds();
    }, []);

    // Compute Active Feeds
    const filteredItems = items.filter(item => {
        // Fix: Check both name and key (to support 'bilibili_dynamic' from DB and 'Bilibili' from RSS)
        // Also check if source contains key or name for partial matches (e.g., "QQ群: xxx" should match "qq_all")
        const config = RSS_FEEDS.find(f =>
            f.name === item.source ||
            f.key === item.source ||
            item.source.toLowerCase().includes('qq') && f.key === 'qq_all' ||
            item.source.toLowerCase().includes('telegram') && f.key === 'telegram_main' ||
            item.source.toLowerCase().includes('twitter') && f.key === 'x_twitter' ||
            item.source.toLowerCase().includes('bilibili') && f.key === 'bilibili_dynamic'
        );
        // If no config found, filter out the item (unknown source)
        if (!config) return false;
        // If config found but source is disabled, filter out
        if (!enabledSources[config.key]) return false;

        // Filter Logic
        let categoryMatch = true;
        if (filter === 'culture') categoryMatch = item.source.includes('机核') || item.source.includes('小黑盒') || item.source.includes('Bilibili');
        else if (filter === 'frontier') categoryMatch = item.source.includes('Linux') || item.source.includes('Reddit') || item.source.includes('Technology') || item.source.includes('Game Dev');
        else if (filter === 'wool') categoryMatch = item.source.includes('买') || item.source.includes('Telegram');

        if (!categoryMatch) return false;

        if (selectedDate) {
            if (!item.isoDate) return false;
            const [year, month, day] = selectedDate.split('-').map(Number);
            const d = new Date(item.isoDate);
            return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
        }
        return true;
    });

    const toggleExpand = (key: string) => {
        setExpandedParents(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderSourceList = () => {
        const roots = RSS_FEEDS.filter(f => !f.parentId);

        return (
            <div className="space-y-1">
                {roots.map(root => {
                    if (!root.enabled && !enabledSources[root.key]) return null; // Optional: hide disabled configs? No, let user toggle back if they want.
                    // Actually, if config.enabled is false (like Heybox now), it might not show in the list if we filtered by enabledSources initial state.
                    // But we initialize enabledSources to match config. 

                    const children = RSS_FEEDS.filter(f => f.parentId === root.key);
                    const hasChildren = children.length > 0;
                    const isExpanded = expandedParents[root.key];

                    return (
                        <div key={root.key}>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group transition-colors select-none cursor-pointer" onClick={() => hasChildren && toggleExpand(root.key)}>
                                {/* Checkbox */}
                                <div
                                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${enabledSources[root.key]
                                        ? 'bg-blue-500 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                        : 'border-white/20 hover:border-white/40 bg-transparent'
                                        }`}
                                    onClick={(e) => { e.stopPropagation(); toggleSource(root.key, !enabledSources[root.key]); }}
                                >
                                    {enabledSources[root.key] && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </div>

                                {/* Label */}
                                <span className={`text-sm flex-1 truncate transition-colors ${enabledSources[root.key] ? 'text-gray-200 shadow-blue-500/20 drop-shadow-sm' : 'text-gray-500'}`}>
                                    {root.name}
                                </span>

                                {/* Expand Icon */}
                                {hasChildren && (
                                    <svg
                                        className={`w-3 h-3 text-white/30 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </div>

                            {/* Children */}
                            {hasChildren && (
                                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                    <div className="ml-6 space-y-1 border-l border-white/10 pl-2">
                                        {children.map(child => (
                                            <div
                                                key={child.key}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors"
                                                onClick={() => toggleSource(child.key, !enabledSources[child.key])}
                                            >
                                                <div className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center transition-all ${enabledSources[child.key]
                                                    ? 'bg-purple-500/50 border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                                                    : 'border-white/10 group-hover:border-white/30 bg-transparent'
                                                    }`}>
                                                    {enabledSources[child.key] && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <span className={`text-xs flex-1 truncate transition-colors ${enabledSources[child.key] ? 'text-gray-300' : 'text-gray-600'}`}>{child.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Visual Configs
    // Visual Configs
    const themeConfig = {
        oled: {
            bg: 'bg-black',
            sidebar: 'bg-black border-zinc-900',
            header: 'bg-black/90 border-zinc-900',
            text: 'text-zinc-300',
            subtext: 'text-zinc-600',
            card: 'bg-zinc-900/50 border-zinc-900 hover:border-zinc-700',
            activeTab: 'bg-zinc-900 text-zinc-100',
            hoverTab: 'hover:text-zinc-300 hover:bg-zinc-900',
            dateHeader: 'bg-black/90 text-zinc-500 border-zinc-900'
        },
        navy: {
            bg: 'bg-[#0f172a]',
            sidebar: 'bg-[#0f172a] border-slate-800',
            header: 'bg-[#0f172a]/90 border-slate-800',
            text: 'text-slate-200',
            subtext: 'text-slate-500',
            card: 'bg-[#1e293b] border-slate-700/50 hover:border-slate-500/50 shadow-sm',
            activeTab: 'bg-slate-800 text-blue-100',
            hoverTab: 'hover:text-slate-200 hover:bg-slate-800/50',
            dateHeader: 'bg-[#0f172a]/95 text-slate-400 border-slate-800'
        },
        light: {
            bg: 'bg-slate-50',
            sidebar: 'bg-white border-slate-200',
            header: 'bg-white/90 border-slate-200',
            text: 'text-slate-900',
            subtext: 'text-slate-500',
            card: 'bg-white border-slate-200 hover:border-slate-300 shadow-sm',
            activeTab: 'bg-slate-100 text-slate-900',
            hoverTab: 'hover:text-slate-700 hover:bg-slate-50',
            dateHeader: 'bg-slate-50/90 text-slate-600 border-slate-200'
        },
        treasure: {
            bg: 'bg-[#1c1917]', // Stone-900 (Warm Dark)
            sidebar: 'bg-[#44403c] border-amber-900/30', // Stone-700 (Brighter)
            header: 'bg-[#44403c]/90 border-amber-900/30',
            text: 'text-amber-50',
            subtext: 'text-amber-200/60',
            card: 'bg-stone-800/40 backdrop-blur-sm border-amber-900/20 hover:border-amber-700/40 hover:bg-stone-800/60', // Semi-transparent warm
            activeTab: 'bg-amber-900/30 text-amber-100 border border-amber-700/50',
            hoverTab: 'hover:text-amber-50 hover:bg-amber-900/20',
            dateHeader: 'bg-stone-900/80 text-amber-200/80 border-amber-900/20'
        }
    };

    const currentTheme = themeConfig[viewMode === 'dim' ? 'navy' : viewMode === 'treasure' ? 'treasure' : viewMode];

    // Group items by date string (YYYY-MM-DD)
    const groupedItems = filteredItems.reduce((acc, item) => {
        if (!item.isoDate) return acc;
        const dateKey = new Date(item.isoDate).toLocaleDateString('en-CA'); // YYYY-MM-DD
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {} as Record<string, FeedItem[]>);

    // Sort dates descending
    const sortedDates = Object.keys(groupedItems).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const getDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <div className={`min-h-screen font-sans flex overflow-hidden duration-300 ${currentTheme.bg} ${currentTheme.text}`}
            style={viewMode === 'treasure' ? {
                background: `
                    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E"),
                    linear-gradient(135deg, 
                        #1c1917 0%,
                        #292524 20%,
                        #44403c 40%,
                        #78350f 60%,
                        #451a03 80%,
                        #1c1917 100%
                    )
                `,
                backgroundAttachment: 'fixed'
            } : undefined}
        >
            {/* Sidebar ... */}
            <aside className={`w-64 border-r flex-shrink-0 flex flex-col h-screen transition-colors duration-300 ${currentTheme.sidebar}`}>
                {/* ... (sidebar content) ... */}
                <div className={`h-16 flex items-center px-6 border-b ${currentTheme.sidebar.split(' ')[1]}`}>
                    <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-sm mr-3 ${viewMode === 'light' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'}`}>N</div>
                    <span className="font-semibold tracking-tight">Nexus</span>
                </div>

                <div className="p-4 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Classification */}
                    <div>
                        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 px-2 ${currentTheme.subtext}`}>Sectors</h3>
                        <div className="space-y-0.5">
                            {(['all', 'frontier', 'culture', 'wool'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab)}
                                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-3 font-medium ${filter === tab ? currentTheme.activeTab : `${currentTheme.subtext} ${currentTheme.hoverTab}`
                                        }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${tab === 'all' ? 'bg-zinc-400' :
                                        tab === 'frontier' ? 'bg-blue-500' :
                                            tab === 'culture' ? 'bg-purple-500' : 'bg-emerald-500'
                                        }`} />
                                    {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sources Tree */}
                    <div>
                        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 px-2 ${currentTheme.subtext}`}>Sources</h3>
                        {renderSourceList()}
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${currentTheme.sidebar.split(' ')[1]}`}>
                    <div className={`flex items-center gap-2 text-xs ${currentTheme.subtext}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Online</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col h-screen relative">
                {/* Header */}
                <header className={`h-16 backdrop-blur border-b flex items-center justify-between px-8 z-20 flex-shrink-0 transition-colors duration-300 ${currentTheme.header}`}>
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-semibold opacity-90">
                            {filter === 'all' ? 'Feed' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className={`text-xs font-mono font-medium ${currentTheme.subtext}`}>
                            {filteredItems.length} ITEMS
                        </div>

                        {/* Appearance Settings */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${currentTheme.subtext}`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            </button>

                            {showSettings && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-2 z-50">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2">Appearance</div>
                                    <div className="space-y-1">
                                        <button onClick={() => setViewMode('light')} className={`w-full text-left px-3 py-2 rounded text-xs flex items-center gap-2 ${viewMode === 'light' ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                            <div className="w-3 h-3 rounded-full bg-white border border-zinc-300"></div> Light
                                        </button>
                                        <button onClick={() => setViewMode('dim')} className={`w-full text-left px-3 py-2 rounded text-xs flex items-center gap-2 ${viewMode === 'dim' ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                            <div className="w-3 h-3 rounded-full bg-[#0f172a] border border-slate-600"></div> Navy (Default)
                                        </button>
                                        <button onClick={() => setViewMode('oled')} className={`w-full text-left px-3 py-2 rounded text-xs flex items-center gap-2 ${viewMode === 'oled' ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                            <div className="w-3 h-3 rounded-full bg-black border border-zinc-700"></div> Lights Out
                                        </button>
                                        <button onClick={() => setViewMode('treasure')} className={`w-full text-left px-3 py-2 rounded text-xs flex items-center gap-2 ${viewMode === 'treasure' ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                            <div className="w-3 h-3 rounded-full bg-[#1c1917] border border-stone-600"></div> Treasure
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center pt-20">
                            <div className={`w-6 h-6 border-2 rounded-full animate-spin ${viewMode === 'light' ? 'border-zinc-200 border-t-zinc-500' : 'border-zinc-700 border-t-zinc-400'}`} />
                        </div>
                    ) : sortedDates.length > 0 ? (
                        <div className="space-y-12 w-full pb-20">
                            {sortedDates.map(date => (
                                <section key={date}>
                                    <div className={`py-4 mb-4 border-b flex items-center gap-4 transition-colors duration-300 ${currentTheme.dateHeader}`}>
                                        <h3 className="text-sm font-bold uppercase tracking-wider">
                                            {getDateLabel(date)}
                                        </h3>
                                        <div className={`h-px flex-1 opacity-50 ${viewMode === 'light' ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
                                    </div>

                                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 space-y-4 w-full">
                                        {groupedItems[date].map((item, idx) => (
                                            <div key={item.link + idx} className="break-inside-avoid">
                                                <FeedCard item={item} theme={currentTheme.card} textTheme={currentTheme.text} subTextTheme={currentTheme.subtext} />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    ) : (
                        <div className={`flex flex-col items-center justify-center h-full ${currentTheme.subtext}`}>
                            <p>No signal.</p>
                            <button
                                onClick={() => setFilter('all')}
                                className="mt-4 text-xs hover:opacity-80 underline"
                            >
                                Reset Filters
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
