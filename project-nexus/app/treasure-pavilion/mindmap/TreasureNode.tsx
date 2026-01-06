'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from '@/lib/utils';
import { FileText, ImageIcon, Folder } from 'lucide-react';

// Color map for Themes
const THEME_COLORS: Record<string, string> = {
  'Tech': '#3b82f6', // blue
  'Art': '#d946ef', // fuchsia
  'Life': '#22c55e', // green
  'Idea': '#f59e0b', // amber
  'Game': '#ec4899', // pink
  'Misc': '#94a3b8', // slate
  // Default fallback
  'default': '#6366f1' // indigo
};

const TreasureNode = ({ data }: { data: any }) => {
  const isTagCategory = data.type === 'TAG_CATEGORY';
  const theme = data.theme || 'default';

  // Theme color logic (first item of array if multiple)
  const mainTheme = Array.isArray(theme) ? theme[0] : theme;
  const color = THEME_COLORS[mainTheme] || THEME_COLORS['default'];

  // Dynamic glow style
  const glowStyle = {
    boxShadow: data.isSelected
      ? `0 0 20px 2px ${color}`
      : `0 0 10px 0px ${color}40`,
    borderColor: color
  };

  const viewMode = data.viewMode || 'galaxy';
  const isStructured = viewMode === 'timeline' || viewMode === 'taxonomy';

  if (isTagCategory) {
    return (
      <div
        className={cn(
          'px-3 py-1.5 rounded-full border bg-black/80 backdrop-blur-md transition-all',
          data.isSelected ? 'scale-110 z-10' : 'opacity-80'
        )}
        style={{ borderColor: '#facc1550', boxShadow: data.isSelected ? '0 0 15px #facc15' : 'none' }}
      >
        <Handle type="target" position={Position.Left} className="w-1 h-1 !bg-yellow-500/50 !border-none" />
        <div className="flex items-center gap-2 px-1">
          <Folder size={14} className="text-yellow-400 shrink-0" />
          <span className="text-xs font-bold text-yellow-100/90 tracking-wide truncate max-w-[120px]" title={data.label}>{data.label}</span>
          {data.treasureCount > 0 && (
            <span className="text-[10px] text-yellow-500/80 bg-yellow-400/10 px-1.5 rounded-sm">{data.treasureCount}</span>
          )}
        </div>
        <Handle type="source" position={Position.Right} className="w-1 h-1 !bg-yellow-500/50 !border-none" />
      </div>
    );
  }

  // STRUCTURED REVIEW MODE (Card Style)
  if (isStructured) {
    return (
      <div
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-300 pointer-events-auto",
          "w-[220px] h-[60px] bg-[#0d1117]/90 backdrop-blur-md hover:bg-[#161b22]",
          data.isSelected
            ? "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] z-20 scale-105"
            : "border-white/5 hover:border-white/10 opacity-90 hover:opacity-100",
          "structure-card" // Added hook for CSS LOD
        )}
        style={{
          borderLeft: `3px solid ${color}`,
        }}
      >
        {/* Logic to determine icon */}
        <div className={cn("p-1.5 rounded-md bg-white/5 text-white/70 group-hover:text-white group-hover:bg-white/10 transition-colors shrink-0", "structure-card-icon")}>
          {data.type === 'IMAGE' ? <ImageIcon size={14} /> : <FileText size={14} />}
        </div>

        <div className={cn("flex flex-col min-w-0 flex-1", "structure-card-content")}>
          <span className={cn("text-xs font-medium text-gray-200 truncate group-hover:text-white transition-colors", data.isSelected && "text-blue-200")}>
            {data.title}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-500 font-mono truncate">
              {data.createdAt ? new Date(data.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
            </span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 text-white/30 truncate max-w-[80px]">
              {mainTheme}
            </span>
          </div>
        </div>

        <Handle type="target" position={Position.Left} className="w-0 h-0 opacity-0" />
        <Handle type="source" position={Position.Right} className="w-0 h-0 opacity-0" />
      </div>
    );
  }

  // DEFAULT: GALAXY MODE (Dot Style)
  return (
    <div className="group relative flex flex-col items-center justify-center pointer-events-auto">
      {/* Selection Halo (Glow) */}
      {data.isSelected && (
        <div
          className="absolute -z-10 rounded-full animate-pulse-slow"
          style={{
            width: '40px',
            height: '40px',
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`
          }}
        />
      )}

      {/* Visual Dot (The Star) */}
      <div
        className={cn(
          "rounded-full transition-all duration-300 shadow-[0_0_10px_currentColor] treasure-node-dot relative z-10",
          data.isSelected ? "w-4 h-4" : "w-1.5 h-1.5 group-hover:w-3 group-hover:h-3"
        )}
        style={{
          backgroundColor: color,
          color: color,
          boxShadow: data.isSelected || data.isHovered ? `0 0 15px 2px ${color}` : `0 0 6px ${color}`
        }}
      >
        {/* Orbit/Tag Indicator (Tiny satellite dot) */}
        {!data.isSelected && (
          <div
            className="absolute -right-1 -top-1 w-1 h-1 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: color }}
          />
        )}

        {/* Icon (Only on substantial interaction) */}
        {(data.isSelected || data.isHovered) && (
          <div className="w-full h-full flex items-center justify-center animate-in fade-in zoom-in treasure-node-icon">
            {data.type === 'IMAGE' ? (
              <ImageIcon className="w-2.5 h-2.5 text-white stroke-[3]" />
            ) : (
              <FileText className="w-2.5 h-2.5 text-white stroke-[3]" />
            )}
          </div>
        )}
      </div>

      {/* Satellite Title (Ghost -> Glass) */}
      <div
        className={cn(
          "mt-2 text-[10px] sm:text-xs font-medium text-center transition-all duration-200 treasure-node-title select-none",
          data.isSelected
            ? "text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 z-20 shadow-xl translate-y-1"
            : "text-white/40 opacity-0 group-hover:opacity-100 group-hover:text-white group-hover:translate-y-0 translate-y-[-4px]"
        )}
        style={{
          maxWidth: '160px',
          textShadow: data.isSelected ? '0 1px 2px rgba(0,0,0,0.8)' : 'none'
        }}
      >
        {data.title}
        {/* Subtitle/Tag line on hover/select */}
        {(data.isSelected) && (
          <div className="text-[8px] text-white/50 font-normal mt-0.5">{mainTheme}</div>
        )}
      </div>

      <Handle type="target" position={Position.Left} className="w-0 h-0 opacity-0" />
      <Handle type="source" position={Position.Right} className="w-0 h-0 opacity-0" />
    </div>
  );
};

export default memo(TreasureNode);
