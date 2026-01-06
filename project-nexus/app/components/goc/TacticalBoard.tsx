/**
 * GOC Tactical Board - 战术板 (Refactored)
 * 
 * 架构说明：
 * - 逻辑层：useTacticalBoard Hook
 * - UI 层：TodoSection, NotesSection
 */

"use client";

import { useTacticalBoard } from "@/app/hooks/goc/use-tactical-board";
import { TodoSection } from "./tactical-board/TodoSection";
import { NotesSection } from "./tactical-board/NotesSection";

export default function TacticalBoard() {
  const {
    todos,
    notes,
    playerNotes,
    me,
    others,
    activeTab, setActiveTab,
    todoFilter, setTodoFilter,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateSharedNotes,
    updateMyNotes,
    getNoteData,
    getTabContent,
  } = useTacticalBoard();

  if (!todos || notes === undefined || !playerNotes) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-sm bg-zinc-950">
        Loading Tactical Data...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-r border-zinc-800 text-zinc-100 font-mono">
      {/* Header */}
      <div className="p-4 border-b border-zinc-900">
         <h2 className="text-xl font-bold text-[#D583F0] tracking-wider">TACTICAL BOARD</h2>
      </div>
      
      {/* To-Do Section */}
      <TodoSection
        todos={todos}
        todoFilter={todoFilter}
        setTodoFilter={setTodoFilter}
        meId={me?.id}
        addTodo={addTodo}
        toggleTodo={toggleTodo}
        deleteTodo={deleteTodo}
      />

      {/* Notes Section */}
      <NotesSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabContent={getTabContent()}
        playerNotes={playerNotes}
        meId={me?.id}
        others={others}
        getNoteData={getNoteData}
        handleNoteChange={(val) => {
          if (activeTab === 'shared') updateSharedNotes(val);
          else if (activeTab === 'my') updateMyNotes(val);
        }}
      />
    </div>
  );
}