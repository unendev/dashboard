'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FinderState, FinderDimension, FinderColumnItem } from './types';
import { buildTagHierarchy, buildTimeHierarchy, buildThemeHierarchy, TagNode, TimeNode } from './finder-data-utils';
import { DimensionColumn } from './DimensionColumn';
import { NavigationColumn } from './NavigationColumn';
import { FinderFeed } from './FinderFeed';
import { FinderInspector } from './FinderInspector'; // We'll build these next
import useSWR from 'swr';
import { Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function MillerLayout() {
    // Corrected: Use mode=finder to fetch ALL items with FULL content unpaginated
    const { data, isLoading } = useSWR('/api/treasures?mode=finder', fetcher);
    const treasures = data?.treasures || [];

    // Global Finder State
    const [state, setState] = useState<FinderState>({
        dimension: 'TIME',
        path: [],
        selectedTreasureId: null
    });

    // UI State
    const [showLegacyTags, setShowLegacyTags] = useState(false);
    const [hoveredTreasureId, setHoveredTreasureId] = useState<string | null>(null);

    // Persistence for Legacy Tags
    useEffect(() => {
        const stored = localStorage.getItem('finder_show_legacy_tags');
        if (stored) setShowLegacyTags(JSON.parse(stored));
    }, []);

    const handleToggleLegacy = (val: boolean) => {
        setShowLegacyTags(val);
        localStorage.setItem('finder_show_legacy_tags', JSON.stringify(val));
    };

    // URL Deep Linking
    useEffect(() => {
        if (isLoading || treasures.length === 0) return;

        // Check URL params
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        if (id && !state.selectedTreasureId) {
            const treasure = treasures.find((t: any) => t.id === id);
            if (treasure) {
                // Find path to this treasure
                // Default to Time dimension
                const d = new Date(treasure.createdAt);
                if (!isNaN(d.getTime())) {
                    const year = d.getFullYear().toString();
                    const month = `${year}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                    setState({
                        dimension: 'TIME',
                        path: [year, month],
                        selectedTreasureId: id
                    });
                }
            }
        }
    }, [isLoading, treasures]); // Run once when treasures load

    // Pre-computed Hierarchies
    const hierarchies = useMemo(() => {
        if (treasures.length === 0) return { tags: new Map(), time: new Map(), themes: new Map() };
        return {
            tags: buildTagHierarchy(treasures, showLegacyTags),
            time: buildTimeHierarchy(treasures),
            themes: buildThemeHierarchy(treasures)
        };
    }, [treasures, showLegacyTags]);

    // Handle Dimension Change (Root Column)
    const handleDimensionChange = (dim: FinderDimension) => {
        setState({ dimension: dim, path: [], selectedTreasureId: null });
    };

    // Handle Navigation (Middle Columns)
    const handleNavigate = (depth: number, id: string) => {
        setState(prev => {
            const newPath = prev.path.slice(0, depth);
            newPath.push(id);
            return { ...prev, path: newPath, selectedTreasureId: null };
        });
    };

    // Handle Treasure Selection (Feed Column)
    const handleSelectTreasure = (id: string) => {
        setState(prev => ({ ...prev, selectedTreasureId: id }));
    };

    // Helper to collect all treasures from a node and its children (Recursive)
    const collectTreasuresRecursively = (node: TagNode | TimeNode | undefined): string[] => {
        if (!node) return [];
        let ids = [...node.treasures];
        node.children.forEach(child => {
            ids = [...ids, ...collectTreasuresRecursively(child as any)];
        });
        // Deduplicate
        return Array.from(new Set(ids));
    };

    // Resolve Current List of Treasures for Feed
    const currentFeedTreasures = useMemo(() => {
        // Traverse the path to find the leaf node's treasures
        if (state.dimension === 'TIME') {
            if (state.path.length === 0) return [];
            let node: TimeNode | undefined = hierarchies.time.get(state.path[0]);
            if (state.path.length > 1 && node) {
                node = node.children.get(state.path[1]);
            }
            // For Time: Do we show subtree? Time is strict hierarchical. 
            // Usually Year -> All months. 
            // If Year selected, show all year's treasures.
            const ids = collectTreasuresRecursively(node);
            return treasures.filter((t: any) => ids.includes(t.id));
        }
        else if (state.dimension === 'TAGS') {
            if (state.path.length === 0) return [];
            // Traverse map
            let node: TagNode | undefined = hierarchies.tags.get(state.path[0]);
            for (let i = 1; i < state.path.length; i++) {
                if (node) node = node.children.get(state.path[i]);
            }
            // Recursive collection for Tags
            const ids = collectTreasuresRecursively(node);
            return treasures.filter((t: any) => ids.includes(t.id));
        }
        else if (state.dimension === 'THEMES') {
            if (state.path.length === 0) return [];
            const node = hierarchies.themes.get(state.path[0]);
            if (node) return treasures.filter((t: any) => node!.treasures.includes(t.id));
        }
        else if (state.dimension === 'ORPHANS') {
            return treasures.filter((t: any) => !t.tags || t.tags.length === 0);
        }

        return [];
    }, [state, hierarchies, treasures]);

    // Hover Preview Handler
    const handleHoverTreasure = (id: string | null) => {
        setHoveredTreasureId(id);
    };

    // Effective ID to show in Inspector (Selected or Hovered)
    const activeInspectorId = hoveredTreasureId || state.selectedTreasureId;

    if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-white/50" /></div>;

    return (
        <div className="flex h-screen w-full bg-[#0d1117] overflow-hidden text-sm">
            {/* Column 1: Dimensions */}
            <div className="w-[200px] border-r border-white/5 flex-shrink-0 bg-[#0d1117] flex flex-col">
                <DimensionColumn activeDimension={state.dimension} onSelect={handleDimensionChange} />

                {state.dimension === 'TAGS' && (
                    <div className="mt-auto p-4 border-t border-white/5">
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none hover:text-white transition-colors">
                            <input
                                type="checkbox"
                                checked={showLegacyTags}
                                onChange={e => handleToggleLegacy(e.target.checked)}
                                className="rounded bg-white/5 border-white/10 text-blue-500 focus:ring-0 focus:ring-offset-0"
                            />
                            显示旧标签
                        </label>
                    </div>
                )}

                {state.dimension === 'ORPHANS' && (
                    <div className="mt-auto p-4 border-t border-white/5 text-xs text-gray-500">
                        <p>孤岛宝藏：<br />未归类或无标签的遗失内容。</p>
                    </div>
                )}
            </div>

            {/* Column 2: Navigation (Dynamic based on path depth) */}
            {/* Changed from flex-1 to auto width with limit, so it strictly takes column space */}
            <div className="flex-none max-w-[45%] h-full border-r border-white/5 bg-[#0d1117] overflow-hidden flex">
                <NavigationColumn
                    dimension={state.dimension}
                    hierarchies={hierarchies}
                    path={state.path}
                    onNavigate={handleNavigate}
                />
            </div>

            {/* Column 3: Feed */}
            {/* Changed to flex-1 to take all remaining space (solving 'empty middle') */}
            <div className="flex-1 border-r border-white/5 bg-[#0d1117] min-w-[300px]">
                <FinderFeed
                    treasures={currentFeedTreasures}
                    selectedId={state.selectedTreasureId}
                    onSelect={handleSelectTreasure}
                    onHover={handleHoverTreasure}
                    title={state.path.length > 0 ? state.path[state.path.length - 1] : '全部'}
                />
            </div>

            {/* Column 4: Inspector */}
            <div className="flex-1 bg-[#010409] border-l border-white/5">
                {activeInspectorId ? (
                    <FinderInspector treasureId={activeInspectorId} allTreasures={treasures} />
                ) : (
                    <div className="h-full flex items-center justify-center text-white/20 select-none">
                        选择或悬停以查看详情
                    </div>
                )}
            </div>
        </div>
    );
}
