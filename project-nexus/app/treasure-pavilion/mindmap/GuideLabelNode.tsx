import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from '@/lib/utils';

export default memo(({ data }: { data: any }) => {
    return (
        <div className={cn(
            "pointer-events-none select-none transition-all duration-500",
            data.type === 'TIME_MARKER' ? "text-white/20 text-xs font-mono tracking-widest uppercase rotate-0" : "",
            data.type === 'SECTOR_LABEL' ? "text-white/10 text-4xl font-black tracking-tighter uppercase blur-[1px] hover:blur-0 hover:text-white/30 hover:scale-110 transition-all" : "",
            data.type === 'TIME_HEADER' ? "text-blue-300/50 text-xl font-bold tracking-widest border-b border-blue-500/30 pb-2 w-[200px] text-center" : ""
        )}>
            {data.label}
            {data.type === 'TIME_MARKER' && (
                <div className="w-px h-4 bg-white/20 mx-auto mt-1" />
            )}
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </div>
    );
});
