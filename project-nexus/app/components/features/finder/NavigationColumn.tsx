import { FinderDimension } from './types';
import { TagNode, TimeNode } from './finder-data-utils';
import { cn } from '@/lib/utils';
import { ChevronRight, Folder } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
    dimension: FinderDimension;
    hierarchies: {
        tags: Map<string, TagNode>;
        time: Map<string, TimeNode>;
        themes: Map<string, TagNode>;
    };
    path: string[];
    onNavigate: (depth: number, id: string) => void;
}

export function NavigationColumn({ dimension, hierarchies, path, onNavigate }: Props) {

    // We need to render N columns based on path.
    // 1. Root Column (always present if dimension matches)
    // 2. Sub Columns (dependent on path)

    const columns = useMemo(() => {
        // If Orphans, we don't show navigation columns (it's flat)
        if (dimension === 'ORPHANS') return null;

        const cols: FinderColumn[] = [];

        // Level 0: Root
        // For Time: Years. For Tags: Root Tags.
        let rootItems: any[] = [];
        if (dimension === 'TIME') {
            // Sort years descending
            rootItems = Array.from(hierarchies.time.values())
                .sort((a, b) => Number(b.id) - Number(a.id));
        } else if (dimension === 'TAGS') {
            rootItems = Array.from(hierarchies.tags.values());
        } else if (dimension === 'THEMES') {
            rootItems = Array.from(hierarchies.themes.values());
        }
        cols.push({ id: 'root', items: rootItems });

        // --- Level 1+: Children ---
        // Iterate path to find children
        let currentNode: any;
        if (dimension === 'TIME') currentNode = hierarchies.time; // Map
        else if (dimension === 'TAGS') currentNode = hierarchies.tags; // Map

        // For maps, we don't start with a 'node', we start with a collection.
        // The "Root" column is drawn from the initial collection.
        // IF path[0] exists, we draw children of path[0] in Next Col.

        // Path Iteration
        for (let i = 0; i < path.length; i++) {
            const currentId = path[i];

            let foundNode: any = null;

            // Find the node corresponding to currentId at this level
            if (i === 0) {
                // Look in root maps
                if (dimension === 'TIME') foundNode = hierarchies.time.get(currentId);
                else if (dimension === 'TAGS') foundNode = hierarchies.tags.get(currentId);
                else if (dimension === 'THEMES') foundNode = hierarchies.themes.get(currentId);
            } else {
                // Look in previous node's children
                // We need to track the 'previous node' from the loop... 
                // This logic is tricky inside a loop.
                // Let's restart logic properly.
            }
        }

        // Better Logic:
        // Col 0: Derived from hierarchies[dimension]
        // Col 1: Derived from hierarchies[dimension].get(path[0]).children
        // Col 2: Derived from hierarchies[dimension].get(path[0]).children.get(path[1]).children

        let currentMap: Map<string, any> | undefined;
        if (dimension === 'TIME') currentMap = hierarchies.time;
        else if (dimension === 'TAGS') currentMap = hierarchies.tags;
        else if (dimension === 'THEMES') currentMap = hierarchies.themes;

        // We render as many columns as steps in path + 1 (for the next potential step), 
        // BUT usually Miller columns show the *current* level's siblings.
        // Actually, distinct columns:
        // Col 0: All Years
        // Col 1: All Months of Selected Year

        // So we iterate `path.length` to show children.

        // Traverse path to collect child maps 
        // Logic:
        // Root is Level 0 (handled above).
        // If path has 1 item ("2024"), we need Level 1 (Months of 2024).
        // If path has 2 items ("2024", "2024-03"), we need Level 2 (Treasures of 2024-03? No, treasure list is separate).
        // Actually for Time: Year -> Month. Millers stop there.
        // For Tags: Tech -> GameDev -> AI.

        for (let i = 0; i < path.length; i++) {
            if (!currentMap) break;

            const nodeId = path[i];
            const node = currentMap.get(nodeId);

            // If we have a selected node at this level, show its children in the NEXT column
            if (node && node.children && node.children.size > 0) {
                let children = Array.from(node.children.values());

                // Sort Time specifically
                if (dimension === 'TIME') {
                    // Reverse Chronological for Months
                    children.sort((a: any, b: any) => parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]));
                }

                cols.push({ id: `level-${i + 1}`, items: children });
                currentMap = node.children;
            } else {
                currentMap = undefined; // No more children
            }
        }

        return cols;
    }, [dimension, hierarchies, path]);

    if (columns === null) {
        return null; // Render nothing for Orphans dimension
    }

    return (
        <div className="flex h-full overflow-x-auto overflow-y-hidden bg-[#0d1117]">
            {columns.map((col, colIndex) => (
                <div key={col.id} className="w-[220px] border-r border-white/5 flex-shrink-0 flex flex-col bg-[#0d1117] h-full">
                    <div className="h-full overflow-y-auto scrollbar-thin py-2">
                        {col.items.map(item => {
                            const isSelected = path[colIndex] === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(colIndex, item.id)} // Navigate to THIS level (replace)
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-2 text-sm transition-colors mx-1 rounded-md max-w-[95%]",
                                        isSelected
                                            ? "bg-blue-600 text-white"
                                            : "text-gray-300 hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Folder size={14} className={cn(isSelected ? "text-white/80" : "text-blue-400")} />
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-xs opacity-50", isSelected ? "text-white" : "text-gray-500")}>
                                            {item.count}
                                        </span>
                                        {(item.children && item.children.size > 0) && (
                                            <ChevronRight size={14} className="opacity-50" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
