"use client";

import { useState, useTransition } from 'react';
import { Flashcard } from '@prisma/client';
import { updateFlashcardReview } from '../russian/actions';
import Link from 'next/link';
import { useTTS } from '../components/learning/useTTS';
import { Volume2, List, RotateCw } from 'lucide-react';

interface FlashcardReviewClientProps {
  initialCards: Flashcard[];
  allCards?: Flashcard[];
  totalCount?: number;
}

export function FlashcardReviewClient({ initialCards, allCards = [], totalCount = 0 }: FlashcardReviewClientProps) {
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'review' | 'list'>('review');
  const [isPending, startTransition] = useTransition();
  const { speak } = useTTS();

  const handleUpdateReview = (performance: 'Forgot' | 'Good' | 'Easy') => {
    startTransition(async () => {
      const cardId = cards[currentIndex].id;
      await updateFlashcardReview(cardId, performance);
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    });
  };

  // Helper to mask the target word in the context
  const getMaskedContext = (front: string, back: string) => {
    if (!back) return '_____';
    // Simple replace, escaping regex chars
    const escapedFront = front.replace(/[.*+?^${}()|[\\]/g, '\$&');
    return back.replace(new RegExp(escapedFront, 'gi'), '_____');
  };

  // Helper to highlight the target word in the context
  const getHighlightedContext = (front: string, back: string) => {
    if (!back) return front;
    const escapedFront = front.replace(/[.*+?^${}()|[\\]/g, '\$&');
    const parts = back.split(new RegExp(`(${escapedFront})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => (
                <span key={i}>
                    {part.toLowerCase() === front.toLowerCase() ? (
                        <strong className="text-yellow-300 font-bold bg-yellow-500/10 px-1 rounded">
                            {part}
                        </strong>
                    ) : part}
                </span>
            ))}
        </span>
    );
  };

  if (viewMode === 'list') {
      return (
          <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-4 p-2 border-b border-gray-800">
                  <h3 className="text-gray-300 font-bold">词汇表 ({allCards.length})</h3>
                  <button onClick={() => setViewMode('review')} className="text-blue-400 text-xs hover:underline">
                      返回复习
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                  {allCards.map(card => (
                      <div key={card.id} className="bg-gray-800 p-2 rounded border border-gray-700 text-sm">
                          <div className="flex justify-between">
                              <span className="font-bold text-blue-300">{card.front}</span>
                              <span className="text-xs text-gray-500">{new Date(card.nextReviewAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-gray-400 truncate mt-1 text-xs">{card.back}</div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <div className="text-4xl">🎉</div>
            <h3 className="text-xl font-bold text-gray-200">今日任务已完成</h3>
            <p className="text-gray-400 text-sm">
                {totalCount > 0 
                  ? `您已完成所有待复习卡片（共 ${totalCount} 张）。` 
                  : '您还没有创建任何闪卡。'}
            </p>
            <div className="flex gap-4 mt-4">
                <button 
                    onClick={() => setViewMode('list')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-blue-400 transition-colors"
                >
                    <List size={16} /> 查看词汇表
                </button>
            </div>
        </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="w-full h-full flex flex-col justify-center relative">
      {/* Top Bar */}
      <div className="absolute top-0 w-full flex justify-between items-center px-2 py-1 text-xs text-gray-500">
          <span>{currentIndex + 1} / {cards.length}</span>
          <button onClick={() => setViewMode('list')} title="词汇表">
              <List size={14} />
          </button>
      </div>

      <div className="relative h-64 w-full flex-shrink-0 mt-6">
        {/* Card Front (Question: Cloze) */}
        <div className={`absolute inset-0 bg-gray-800 shadow-lg border border-gray-700 rounded-xl flex flex-col items-center justify-center text-center transition-transform duration-500 ${isFlipped ? '[transform:rotateY(180deg)]' : ''} [backface-visibility:hidden]`}>
          <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar flex flex-col items-center justify-center">
              <p className="text-sm text-gray-500 mb-4 uppercase tracking-wider flex-shrink-0">补全句子</p>
              <p className="text-xl text-gray-200 leading-relaxed font-serif">
                {getMaskedContext(currentCard.front, currentCard.back)}
              </p>
              <button 
                onClick={(e) => { e.stopPropagation(); speak(currentCard.back); }}
                className="mt-4 p-2 rounded-full hover:bg-gray-700 text-blue-400 transition-colors"
                title="朗读句子"
              >
                <Volume2 size={20} />
              </button>
          </div>
        </div>
        
        {/* Card Back (Answer: Full Context) */}
        <div className={`absolute inset-0 bg-gray-800 shadow-lg border border-gray-600 rounded-xl flex flex-col items-center justify-center text-center transition-transform duration-500 ${!isFlipped ? '[transform:rotateY(180deg)]' : ''} [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
          <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar flex flex-col items-center justify-center">
              <p className="text-sm text-gray-500 mb-4 uppercase tracking-wider flex-shrink-0">答案</p>
              <p className="text-xl text-gray-200 leading-relaxed font-serif">
                {getHighlightedContext(currentCard.front, currentCard.back)}
              </p>
              <button 
                onClick={(e) => { e.stopPropagation(); speak(currentCard.back); }}
                className="mt-4 p-2 rounded-full hover:bg-gray-700 text-green-400 transition-colors"
                title="朗读句子"
              >
                <Volume2 size={20} />
              </button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex flex-col items-center w-full flex-shrink-0 px-4">
        {isPending ? (
          <p className="animate-pulse text-gray-500">处理中...</p>
        ) : !isFlipped ? (
          <button 
            onClick={() => setIsFlipped(true)}
            className="w-full py-3 bg-blue-600 text-white rounded-md text-lg font-semibold hover:bg-blue-700 shadow-lg transition-all"
          >
            显示答案
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-3 w-full">
            <button 
              onClick={() => handleUpdateReview('Forgot')}
              className="py-3 bg-red-500/20 text-red-400 border border-red-500/50 rounded-md font-semibold hover:bg-red-500/30 transition-all"
            >
              忘记
            </button>
            <button 
              onClick={() => handleUpdateReview('Good')}
              className="py-3 bg-green-500/20 text-green-400 border border-green-500/50 rounded-md font-semibold hover:bg-green-500/30 transition-all"
            >
              掌握
            </button>
            <button 
              onClick={() => handleUpdateReview('Easy')}
              className="py-3 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-md font-semibold hover:bg-blue-500/30 transition-all"
            >
              简单
            </button>
          </div>
        )}
      </div>
    </div>
  );
}