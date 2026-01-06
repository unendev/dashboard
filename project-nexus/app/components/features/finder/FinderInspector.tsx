import { Button } from '@/app/components/ui/button';
import { TwitterStyleCard } from '@/app/components/features/widgets/TwitterStyleCard';
import { ExternalLink, Calendar, Tag, FileText } from 'lucide-react';

interface Props {
    treasureId: string | null;
    allTreasures: any[];
}

export function FinderInspector({ treasureId, allTreasures }: Props) {
    const treasure = allTreasures.find(t => t.id === treasureId);

    if (!treasure) return null;

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Header (Title) */}
            <div className="p-6 pb-2">
                <h2 className="text-xl font-bold text-white mb-2">{treasure.title || 'Untitled'}</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                    <span>{treasure.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>{new Date(treasure.createdAt).toLocaleString()}</span>
                </div>
            </div>

            {/* Content Preview */}
            <div className="px-6 py-4">
                <div className="transform scale-100 origin-top-left">
                    <TwitterStyleCard treasure={treasure} />
                </div>
            </div>

            {/* Metadata Grid */}
            <div className="px-6 py-4 space-y-6">
                {/* Tags */}
                {treasure.tags && treasure.tags.length > 0 && (
                    <div>
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {treasure.tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Theme */}
                {treasure.theme && (
                    <div>
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">Theme</label>
                        <div className="text-sm text-gray-300 bg-white/5 border border-white/10 px-3 py-2 rounded-md inline-block">
                            {typeof treasure.theme === 'string' ? treasure.theme : treasure.theme.join(', ')}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1" />

            {/* Action Footer */}
            <div className="p-6 border-t border-white/10 bg-[#0d1117]">
                <Button
                    className="w-full bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => window.open(`/treasure-pavilion?id=${treasure.id}`, '_blank')}
                >
                    <ExternalLink size={14} className="mr-2" />
                    Open in Full Context
                </Button>
            </div>
        </div>
    );
}
