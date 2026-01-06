"use client";

import React, { useState, useEffect } from 'react';
import { createNote, createFlashcard } from '../../russian/actions'; // Import server actions

interface NoteCardCreatorProps {
  show: boolean;
  onClose: () => void;
  selectedText: string;
  mode: 'note' | 'card'; // To differentiate between note and card creation
}

export function NoteCardCreator({ show, onClose, selectedText, mode }: NoteCardCreatorProps) {
  const [noteContent, setNoteContent] = useState('');
  const [cardFront, setCardFront] = useState(selectedText);
  const [cardBack, setCardBack] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect to sync selected text with the card's front content
  useEffect(() => {
    if (mode === 'card') {
      setCardFront(selectedText);
    }
  }, [selectedText, mode]);

  if (!show) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let result;
    if (mode === 'note') {
      result = await createNote({ sourceText: selectedText, content: noteContent });
    } else { // mode === 'card'
      result = await createFlashcard({ front: cardFront, back: cardBack });
    }
    
    setIsLoading(false);

    if (result?.error) {
      alert(`保存失败: ${result.error}`);
    } else {
      alert(mode === 'note' ? '笔记已成功保存！' : '闪卡已成功保存！');
      setNoteContent('');
      setCardBack('');
      onClose();
    }
  };

  return (
    <div className="NoteCardCreator fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full m-4">
        <h2 className="text-2xl font-bold mb-4">
          {mode === 'note' ? '创建笔记' : '创建闪卡'}
        </h2>
        <form onSubmit={handleSubmit}>
          {mode === 'note' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">原文</label>
                <p className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 break-words">
                  {selectedText || '无选中文本'}
                </p>
              </div>
              <div className="mb-4">
                <label htmlFor="noteContent" className="block text-sm font-medium mb-1">笔记内容</label>
                <textarea
                  id="noteContent"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                ></textarea>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label htmlFor="cardFront" className="block text-sm font-medium mb-1">闪卡正面 (俄语)</label>
                <textarea
                  id="cardFront"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  rows={2}
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="mb-4">
                <label htmlFor="cardBack" className="block text-sm font-medium mb-1">闪卡背面 (解释/笔记)</label>
                <textarea
                  id="cardBack"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  rows={4}
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  required
                ></textarea>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
