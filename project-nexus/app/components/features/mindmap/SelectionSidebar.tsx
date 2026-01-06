import React from 'react';
import { X, ExternalLink, Calendar, Tag, FileText } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { TwitterStyleCard } from '@/app/components/features/widgets/TwitterStyleCard';
import { cn } from '@/lib/utils';
// // import { format } from 'date-fns';

interface SelectionSidebarProps {
    selectedNode: any; // Treasure Data
    onClose: () => void;
    className?: string;
}

export function SelectionSidebar({ selectedNode, onClose, className }: SelectionSidebarProps) {
    if (!selectedNode) {
        return (
            <div className={cn("h-full bg-[#0d1117] border-l border-white/10 p-6 flex flex-col items-center justify-center text-center text-gray-500", className)}>
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <FileText size={24} className="opacity-50" />
                </div>
                <p className="text-sm">点击星图中的节点<br />查看详细信息</p>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full bg-[#0d1117] border-l border-white/10", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#161b22]/50 backdrop-blur">
                <h2 className="text-sm font-semibold text-white/80">宝藏详情</h2>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={onClose}>
                    <X size={14} />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Card Preview */}
                <div className="transform scale-95 origin-top">
                    <TwitterStyleCard treasure={selectedNode} />
                </div>

                {/* Metadata */}
                <div className="space-y-4 text-sm text-gray-400">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">基本信息</label>
                        <div className="bg-white/5 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2"><Calendar size={12} /> 创建时间</span>
                                <span className="text-gray-300">
                                    {new Date(selectedNode.createdAt).toLocaleString('zh-CN', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2"><Tag size={12} /> 类型</span>
                                <span className="text-gray-300">{selectedNode.type}</span>
                            </div>
                        </div>
                    </div>

                    {selectedNode.tags && selectedNode.tags.length > 0 && (
                        <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">标签</label>
                            <div className="flex flex-wrap gap-2">
                                {selectedNode.tags.map((tag: string) => (
                                    <span key={tag} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs border border-indigo-500/30">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/10 bg-[#161b22]/50">
                <Button
                    className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    onClick={() => window.open(`/treasure-pavilion?id=${selectedNode.id}`, '_blank')}
                >
                    <ExternalLink size={14} className="mr-2" />
                    全屏查看
                </Button>
            </div>
        </div>
    );
}
