import { FinderDimension } from './types';
import { Clock, Tag, Box, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    activeDimension: FinderDimension;
    onSelect: (dim: FinderDimension) => void;
}

const ITEMS = [
    { id: 'TIME' as const, label: '时间轴', icon: Clock },
    { id: 'TAGS' as const, label: '分类树', icon: Tag },
    { id: 'THEMES' as const, label: '主题集', icon: Box },
    { id: 'ORPHANS' as const, label: '孤岛', icon: Link2 },
];

export function DimensionColumn({ activeDimension, onSelect }: Props) {
    return (
        <div className="flex flex-col py-2">
            <div className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Dimensions
            </div>
            {ITEMS.map(item => (
                <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2 mx-2 rounded-md transition-colors text-left",
                        activeDimension === item.id
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                            : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    )}
                >
                    <item.icon size={16} />
                    <span className="font-medium">{item.label}</span>
                </button>
            ))}
        </div>
    );
}
