"use client";

import React from 'react';

interface AiExplanationModalProps {
  show: boolean;
  onClose: () => void;
  selectedText: string;
}

export function AiExplanationModal({ show, onClose, selectedText }: AiExplanationModalProps) {
  if (!show) {
    return null;
  }

  // Simulate an AI explanation
  const simulatedExplanation = `[AI 模拟解释] 您选中的 "${selectedText}" 在俄语中可能表示... (此处是 DeepSeek 的解释内容)`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full m-4">
        <h2 className="text-2xl font-bold mb-4">AI 解释</h2>
        <p className="text-lg mb-6">
          {simulatedExplanation}
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
