"use client";

import { useState } from "react";
import { Gamepad2, MessageCircle, BookOpen, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODEL_CONFIG, AIProvider, AIMode } from "@/app/hooks/goc/types";

interface ChatHeaderProps {
  others: readonly any[];
  me: any;
  aiConfig: any; // LiveObject<AIConfig>
  updateAiConfig: (newConfig: Partial<any>) => void;
}

export const ChatHeader = ({
  others,
  me,
  aiConfig,
  updateAiConfig,
}: ChatHeaderProps) => {
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Fallback in case aiConfig is not yet initialized
  if (!aiConfig) {
    return (
      <div className="w-full p-2 border-b border-zinc-800 bg-[#0a0a0a]/90 backdrop-blur flex items-center justify-center h-24">
        <span className="text-zinc-500 text-xs">正在初始化配置...</span>
      </div>
    );
  }

  const { provider, modelId, aiMode, thinkingEnabled } = aiConfig;

  return (
    <div className="w-full p-2 border-b border-zinc-800 bg-[#0a0a0a]/90 backdrop-blur flex flex-col gap-2">
      <div className="flex items-center justify-between px-4">
        <div className="flex-1" />
        <div className="flex-1" />
        <div className="flex-1 flex justify-end">
          {/* 实时人数 */}
          <div className="relative group cursor-default">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono border border-zinc-800 px-2 py-1 rounded-md bg-zinc-900/50 hover:border-zinc-700 transition-colors">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span>{others.length + 1} 在线</span>
            </div>
            {/* 玩家列表浮窗 */}
            <div className="absolute top-full right-0 mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 min-w-[150px]">
              <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2 border-b border-zinc-800 pb-1 flex justify-between">
                <span>操作员</span>
                <span className="text-emerald-500">活跃</span>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-cyan-400 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-cyan-400" />
                  {me?.info?.name || "我"} (你)
                </div>
                {others.map((u) => (
                  <div key={u.connectionId} className="text-xs text-zinc-300 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-600" />
                    {u.info?.name || "未知"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Model & Mode - 单行紧凑布局 */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {/* 模型选择器 - 合并提供商和模型 */}
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:border-cyan-600 transition-colors flex items-center gap-2"
          >
            <span className="text-cyan-400 font-medium">{MODEL_CONFIG[provider as AIProvider]?.label}</span>
            <span className="text-zinc-500">/</span>
            <span>{MODEL_CONFIG[provider as AIProvider]?.models.find(m => m.id === modelId)?.name || modelId}</span>
            <span className="text-zinc-600 text-[10px]">▼</span>
          </button>
          {showModelDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 min-w-[200px] overflow-hidden">
              {(Object.keys(MODEL_CONFIG) as AIProvider[]).map(p => (
                <div key={p}>
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-800/50 border-b border-zinc-800">
                    {MODEL_CONFIG[p].label}
                  </div>
                  {MODEL_CONFIG[p].models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        updateAiConfig({ provider: p, modelId: m.id });
                        setShowModelDropdown(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs hover:bg-zinc-800 transition-colors flex justify-between items-center",
                        provider === p && modelId === m.id ? "text-cyan-400 bg-cyan-950/30" : "text-zinc-300"
                      )}
                    >
                      <span>{m.name}</span>
                      <span className="text-[10px] text-zinc-500">{m.desc}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 思考开关 - 仅当模型支持时显示 */}
        {MODEL_CONFIG[provider as AIProvider]?.models.find(m => m.id === modelId)?.thinking && (
          <>
            <div className="w-px h-5 bg-zinc-700" />
            <button
              onClick={() => updateAiConfig({ thinkingEnabled: !thinkingEnabled })}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-medium transition-all border flex items-center gap-1 shadow-inner",
                thinkingEnabled 
                  ? "bg-purple-900/50 border-purple-600 text-purple-300" 
                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
              )}
              title={thinkingEnabled ? "思考模式开启" : "思考模式关闭"}
            >
              <Brain className="w-3 h-3" />
              <span>{thinkingEnabled ? '开启' : '关闭'}</span>
            </button>
          </>
        )}

        {/* 分隔线 */}
        <div className="w-px h-5 bg-zinc-700" />

        {/* Mode Switcher - 带 tooltip */}
        <div className="flex gap-1">
          <ModeButton 
            mode="encyclopedia" 
            current={aiMode} 
            setMode={(m: AIMode) => updateAiConfig({ aiMode: m })} 
            icon={<BookOpen className="w-4 h-4" />}
            title="百科" 
            desc="知识整理、概念解释与结构化输出" 
            colorClass="blue"
          />
          <ModeButton 
            mode="game" 
            current={aiMode} 
            setMode={(m: AIMode) => updateAiConfig({ aiMode: m })} 
            icon={<Gamepad2 className="w-4 h-4" />}
            title="游戏" 
            desc="游戏相关策略、内容与陪玩" 
            colorClass="cyan"
          />
          <ModeButton 
            mode="casual" 
            current={aiMode} 
            setMode={(m: AIMode) => updateAiConfig({ aiMode: m })} 
            icon={<MessageCircle className="w-4 h-4" />}
            title="疑难/闲聊" 
            desc="疑难杂症解答与日常闲聊" 
            colorClass="amber"
          />
        </div>
      </div>
    </div>
  );
};

// 辅助组件：模式按钮
const ModeButton = ({ mode, current, setMode, icon, title, desc, colorClass }: any) => {
  const isActive = current === mode;
  // Tailwind 不能动态构建完整类名，所以这里用简单映射
  const activeClasses = {
    blue: "bg-blue-900/50 text-blue-400 border-blue-500/30",
    cyan: "bg-cyan-900/50 text-cyan-400 border-cyan-500/30",
    amber: "bg-amber-900/50 text-amber-400 border-amber-500/30",
    emerald: "bg-emerald-900/50 text-emerald-400 border-emerald-500/30",
  }[colorClass as string] || "bg-zinc-800";
  
  const textClasses = {
    blue: "text-blue-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  }[colorClass as string];

  return (
    <div className="relative group">
      <button 
        onClick={() => setMode(mode)} 
        className={cn("p-1.5 rounded transition-all border border-transparent", isActive ? activeClasses : "text-zinc-500 hover:text-zinc-300")}
      >
        {icon}
      </button>
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-40 text-center shadow-2xl">
        <div className={`text-xs font-bold mb-1 ${textClasses}`}>{title}</div>
        <div className="text-[10px] text-zinc-400 leading-tight">{desc}</div>
      </div>
    </div>
  );
};
