import { cn } from '@/lib/utils';
import { TwitterStyleCard } from '@/app/components/features/widgets/TwitterStyleCard';

interface Props {
    treasures: any[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onHover?: (id: string | null) => void;
    title: string;
}

export function FinderFeed({ treasures, selectedId, onSelect, onHover, title }: Props) {
    return (
        <div className="flex flex-col h-full bg-[#0d1117]">
            {/* Header */}
            <div className="h-10 flex items-center px-4 border-b border-white/5 flex-shrink-0">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                    {title} ({treasures.length})
                </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
                {treasures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                        <span className="text-4xl mb-2">🍃</span>
                        <span className="text-sm">空空如也</span>
                    </div>
                ) : (
                    treasures.map(t => (
                        <div
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            onMouseEnter={() => onHover?.(t.id)}
                            onMouseLeave={() => onHover?.(null)}
                            className={cn(
                                "cursor-pointer transition-all duration-200 border-2 rounded-2xl",
                                selectedId === t.id
                                    ? "border-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-blue-500/5"
                                    : "border-transparent hover:border-white/10"
                            )}
                        >
                            {/* We use the TwitterStyleCard for rich content rendering */}
                            <TwitterStyleCard
                                treasure={t}
                                className={cn(
                                    "border-none shadow-none bg-transparent hover:bg-transparent hover:shadow-none p-4",
                                    selectedId === t.id ? "bg-transparent" : "" // Allow wrapper to handle bg
                                )}
                                hideCategoryAvatar={true} // Cleaner look for list
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
