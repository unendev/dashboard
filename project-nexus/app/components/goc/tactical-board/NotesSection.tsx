"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "@/app/components/shared/MarkdownView";
import { MarkdownOutline } from "@/app/components/shared/MarkdownOutline";

interface NotesSectionProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabContent: string;
  playerNotes: any;
  meId?: string;
  others: readonly any[];
  getNoteData: (id: string) => any;
  handleNoteChange: (val: string) => void;
}

export const NotesSection = ({
  activeTab,
  setActiveTab,
  tabContent,
  playerNotes,
  meId,
  others,
  getNoteData,
  handleNoteChange
}: NotesSectionProps) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isEditableTab = activeTab === 'shared' || activeTab === 'my';
  const isCurrentlyEditing = editingNoteId === activeTab;

  useEffect(() => {
    if (isCurrentlyEditing && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isCurrentlyEditing]);

  return (
    <div className="h-1/2 flex flex-col border-t border-zinc-800 bg-zinc-950/50">
      <div className="flex items-center justify-between p-2 bg-zinc-900">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <TabButton id="shared" label="Shared" active={activeTab} onClick={setActiveTab} color="purple" />
          <TabButton id="my" label="My Notes" active={activeTab} onClick={setActiveTab} color="cyan" />
          
          {playerNotes && Array.from(playerNotes.keys()).map((userId: any) => {
             if (userId === meId) return null;
             const noteData = getNoteData(userId);
             let label = noteData.name || others.find(u => u.id === userId)?.info?.name || `User ${userId.slice(-4)}`;
             return <TabButton key={userId} id={userId} label={label} active={activeTab} onClick={setActiveTab} color="zinc" />;
          })}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative group overflow-hidden" onClick={() => isEditableTab && setEditingNoteId(activeTab)}>
          <button
            onClick={(e) => { e.stopPropagation(); setOutlineOpen(!outlineOpen); }}
            className="absolute top-2 right-2 z-20 p-1.5 bg-zinc-800/50 hover:bg-zinc-700 rounded transition-colors"
          >
            {outlineOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {isCurrentlyEditing ? (
            <textarea
              ref={textAreaRef}
              className="w-full h-full bg-zinc-950 p-4 text-sm text-zinc-300 resize-none focus:outline-none focus:bg-zinc-900/50 transition-colors custom-scrollbar leading-relaxed"
              value={tabContent}
              onChange={(e) => handleNoteChange(e.target.value)}
              onBlur={() => setEditingNoteId(null)}
              placeholder="Type details here..."
            />
          ) : (
            <div className="w-full h-full bg-zinc-950 p-4 overflow-y-auto custom-scrollbar">
              <MarkdownView content={tabContent} variant="goc" />
              {!isEditableTab && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-zinc-800/80 text-zinc-400 text-[10px] rounded pointer-events-none z-10">
                  READ ONLY
                </div>
              )}
            </div>
          )}
        </div>

        {outlineOpen && (
          <div className="w-48 border-l border-zinc-800 bg-zinc-900/30 overflow-y-auto custom-scrollbar">
            <MarkdownOutline content={tabContent} className="text-xs" />
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ id, label, active, onClick, color }: any) => {
  const isActive = active === id;
  const colorClasses: any = {
    purple: isActive ? "bg-[#D583F0] text-black" : "text-zinc-500 hover:text-zinc-300",
    cyan: isActive ? "bg-cyan-600 text-white" : "text-zinc-500 hover:text-zinc-300",
    zinc: isActive ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-400",
  };
  return (
    <button
      onClick={() => onClick(id)}
      className={cn("px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors whitespace-nowrap hover:bg-zinc-800", colorClasses[color])}
    >
      {label}
    </button>
  );
};
