import React, { useMemo } from 'react';
import { Folder, ChevronRight, ChevronDown, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/app/components/ui/button';

interface TagData {
    children: Set<string>;
    treasures: Set<string>;
    treasureCount: number;
    data: {
        label: string;
        fullPath: string;
        depth: number;
    };
}

interface TagSidebarProps {
    tagHierarchy: Map<string, TagData>;
    activeTag: string | null;
    onTagSelect: (tagPath: string | null) => void;
    className?: string;
}

// Recursive Tree Item Component
const TreeItem = ({
    path,
    hierarchy,
    activeTag,
    onTagSelect,
    level = 0
}: {
    path: string;
    hierarchy: Map<string, TagData>;
    activeTag: string | null;
    onTagSelect: (path: string | null) => void;
    level?: number;
}) => {
    const node = hierarchy.get(path);
    if (!node) return null;

    const [isExpanded, setIsExpanded] = React.useState(level < 1); // Expand top level by default
    const hasChildren = node.children.size > 0;
    const isActive = activeTag === path || (activeTag?.startsWith(path + '/') ?? false);
    const isSelected = activeTag === path;

    // Manual toggle for expansion to avoid conflict with selection
    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleClick = () => {
        onTagSelect(isSelected ? null : path); // Toggle selection
    };

    const sortedChildren = Array.from(node.children).sort();

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-colors text-sm",
                    isSelected ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5",
                    isActive && !isSelected && "text-indigo-300"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
            >
                <div
                    onClick={hasChildren ? toggleExpand : undefined}
                    className={cn("p-0.5 rounded hover:bg-white/10", !hasChildren && "opacity-0")}
                >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </div>

                <Folder size={14} className={cn(isSelected ? "text-white" : "text-yellow-500/80")} />
                <span className="truncate flex-1">{node.data.label}</span>
                {node.treasureCount > 0 && (
                    <span className="text-xs opacity-50 bg-black/20 px-1.5 rounded-full">{node.treasureCount}</span>
                )}
            </div>

            {isExpanded && sortedChildren.map(childPath => (
                <TreeItem
                    key={childPath}
                    path={childPath}
                    hierarchy={hierarchy}
                    activeTag={activeTag}
                    onTagSelect={onTagSelect}
                    level={level + 1}
                />
            ))}
        </div>
    );
};

export function TagSidebar({ tagHierarchy, activeTag, onTagSelect, className }: TagSidebarProps) {
    // Find root tags (those with no parent in the path)
    const rootTags = useMemo(() => {
        return Array.from(tagHierarchy.keys())
            .filter(path => !path.includes('/'))
            .sort();
    }, [tagHierarchy]);

    if (rootTags.length === 0) return null;

    return (
        <div className={cn("flex flex-col h-full bg-[#0d1117] border-r border-white/10", className)}>
            <div className="p-4 border-b border-white/10 bg-[#161b22]/50 backdrop-blur">
                <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Hash size={14} className="text-indigo-400" />
                    标签结构
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700">
                <div
                    className={cn(
                        "flex items-center gap-2 py-1.5 px-3 mb-2 rounded-md cursor-pointer text-sm font-medium",
                        !activeTag ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                    onClick={() => onTagSelect(null)}
                >
                    <span>✴️</span>
                    <span>全部宝藏 (Universe)</span>
                </div>

                {rootTags.map(path => (
                    <TreeItem
                        key={path}
                        path={path}
                        hierarchy={tagHierarchy}
                        activeTag={activeTag}
                        onTagSelect={onTagSelect}
                    />
                ))}
            </div>
        </div>
    );
}
