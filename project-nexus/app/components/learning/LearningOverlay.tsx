"use client";

import { useState } from 'react';
import { ChatClient } from './ChatClient';
import { NotesList } from './NotesList';
import { FlashcardReviewClient } from '../../review/FlashcardReviewClient';
import { RussianLearningNote, Flashcard } from '@prisma/client';
import { BookOpen, BrainCircuit, PanelRightClose, PanelRightOpen, Menu, StickyNote, GraduationCap, X } from 'lucide-react';

interface LearningOverlayProps {
  initialMessages: any[];
  conversationId: string;
  notes: RussianLearningNote[];
  allFlashcards: Flashcard[];
  flashcards: Flashcard[];
  totalFlashcardsCount: number;
}

export function LearningOverlay({ 
  initialMessages, 
  conversationId, 
  notes, 
  flashcards,
  allFlashcards,
  totalFlashcardsCount
}: LearningOverlayProps) {
  const [desktopActiveTab, setDesktopActiveTab] = useState<'notes' | 'review'>('notes');
  const [isToolsPanelOpen, setToolsPanelOpen] = useState(true);
  
  // Mobile State
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerContent, setMobileDrawerContent] = useState<'notes' | 'review' | null>(null);

  const openMobileDrawer = (content: 'notes' | 'review') => {
    setMobileDrawerContent(content);
    setMobileDrawerOpen(true);
  };

  const renderNotes = () => <NotesList initialNotes={notes} />;
  const renderReview = () => <FlashcardReviewClient initialCards={flashcards} allCards={allFlashcards} totalCount={totalFlashcardsCount} />;

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden">
      
      {/* ---- Main Content Area (Unified for both Mobile and Desktop) ---- */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile Header (Now part of this component) */}
        <header className="md:hidden sticky top-0 z-10 bg-gray-900 border-b border-gray-800 p-2 flex items-center justify-between">
            {/* Placeholder for potential hamburger menu button from parent */}
            <div></div>
            <h1 className="text-lg font-semibold text-gray-200">俄语学习</h1>
            <div className="flex items-center gap-2">
                <button onClick={() => openMobileDrawer('notes')} className="p-2 text-gray-400 hover:text-white"><StickyNote size={20} /></button>
                <button onClick={() => openMobileDrawer('review')} className="p-2 text-gray-400 hover:text-white"><GraduationCap size={20} /></button>
            </div>
        </header>
        
        <div className="flex-1 overflow-hidden h-full">
          <ChatClient 
            initialMessages={initialMessages} 
            conversationId={conversationId} 
          />
        </div>

        {/* PC: Toggle Button for Tools Panel */}
        {!isToolsPanelOpen && (
          <div className="absolute top-4 right-4 z-20 hidden md:block">
            <button
              onClick={() => setToolsPanelOpen(true)}
              className="p-2 rounded-md bg-gray-800 text-gray-400 hover:text-white border border-gray-700 shadow-sm"
            >
              <PanelRightOpen size={20} />
            </button>
          </div>
        )}
      </div>

      {/* ---- Desktop: Right Side Panel ---- */}
      <div 
        className={`hidden md:flex flex-shrink-0 bg-gray-900 border-l border-gray-800 flex-col transition-all duration-300 ease-in-out
          ${isToolsPanelOpen ? 'w-96 translate-x-0' : 'w-0 translate-x-full border-l-0 overflow-hidden'}
        `}
      >
        <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            <button onClick={() => setDesktopActiveTab('notes')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${desktopActiveTab === 'notes' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}><BookOpen size={16} /> 笔记</button>
            <button onClick={() => setDesktopActiveTab('review')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${desktopActiveTab === 'review' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}><BrainCircuit size={16} /> 复习 {flashcards.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">{flashcards.length}</span>}</button>
          </div>
          <button onClick={() => setToolsPanelOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-md" title="Collapse Panel"><PanelRightClose size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {desktopActiveTab === 'notes' ? renderNotes() : renderReview()}
        </div>
      </div>

      {/* ---- Mobile: Right Sliding Drawer ---- */}
      {isMobileDrawerOpen && (
          <>
            {/* Overlay */}
            <div 
                className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={() => setMobileDrawerOpen(false)}
            ></div>
            {/* Drawer */}
            <div className={`md:hidden fixed top-0 right-0 h-full w-[85%] max-w-md bg-gray-900 z-50 shadow-2xl border-l border-gray-800 flex flex-col transition-transform duration-300 ease-in-out ${isMobileDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between p-2 border-b border-gray-800">
                    <h3 className="font-bold text-lg text-white ml-2">{mobileDrawerContent === 'notes' ? '笔记' : '复习'}</h3>
                    <button onClick={() => setMobileDrawerOpen(false)} className="p-2 text-gray-400 hover:text-white">
                        <X size={22} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {mobileDrawerContent === 'notes' ? renderNotes() : renderReview()}
                </div>
            </div>
          </>
      )}

    </div>
  );
}
