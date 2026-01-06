import { HeadingItem } from '@/lib/markdown'

interface EditorOutlineProps {
  outline: HeadingItem[];
  activeHeadingId: string | null;
  onGotoHeading: (item: HeadingItem) => void;
  showOutline: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function EditorOutline({
  outline,
  activeHeadingId,
  onGotoHeading,
  showOutline,
  onMouseEnter,
  onMouseLeave
}: EditorOutlineProps) {
  return (
    <div 
      className="hidden md:block absolute right-0 top-0 bottom-0 z-[5] pointer-events-none"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {showOutline ? (
        <div className="w-72 h-full bg-gray-900/80 backdrop-blur-md border-l border-white/5 shadow-2xl overflow-hidden flex flex-col transition-all pointer-events-auto">
          <div className="flex items-center justify-between p-4 border-b border-white/5 flex-shrink-0">
            <div className="text-sm font-medium text-gray-300">文档大纲</div>
            <div className="text-xs text-gray-500">鼠标移出自动收起</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {outline.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                无标题
                <br />
                <span className="text-xs">使用 H1/H2/H3 自动生成</span>
              </div>
            ) : (
              <ul className="space-y-1">
                {outline.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                        activeHeadingId === item.id 
                          ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-400' 
                          : 'text-gray-300 hover:bg-gray-800/60 hover:text-gray-200'
                      }`}
                      style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                      onClick={() => onGotoHeading(item)}
                      title={item.text}
                    >
                      <span className="block truncate">{item.text || '（无标题文本）'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div
          className="bg-gray-900/95 backdrop-blur-sm border-l border-gray-700/50 p-3 shadow-lg hover:bg-gray-800/95 transition-all group rounded-l-lg pointer-events-auto cursor-pointer"
          title="悬浮展开大纲"
        >
          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transform rotate-180 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
