'use client'

import React from 'react';
import CreateLogModal from '@/app/components/features/log/CreateLogModal';
import { QuickCreateModal, CreateTreasureData } from '@/app/components/shared/QuickCreateModal';
import DailyProgressModal from '@/app/components/features/progress/DailyProgressModal';

interface ModalsManagerProps {
  // CreateLogModal
  isCreateLogModalOpen: boolean;
  onCloseCreateLogModal: () => void;
  onLogSaved: () => void;
  onAddToTimer: (taskName: string, category: string, date: string, initialTime?: number, instanceTagNames?: string, parentId?: string | null) => Promise<void>;
  selectedDate?: string;

  // QuickCreateModal (藏宝阁)
  isTreasureModalOpen: boolean;
  treasureModalType: 'TEXT' | 'IMAGE';
  onCloseTreasureModal: () => void;
  onCreateTreasure: (data: CreateTreasureData) => Promise<void>;
  showSuccessNotification: boolean;

  // DailyProgressModal
  isDailyProgressOpen: boolean;
  progressTargetDate: string;
  onCloseDailyProgress: () => void;
  onProgressConfirmed: () => void;
}

/**
 * 模态框管理器
 * 
 * 统一管理所有模态框的渲染
 */
export function ModalsManager({
  isCreateLogModalOpen,
  onCloseCreateLogModal,
  onLogSaved,
  onAddToTimer,
  selectedDate,
  isTreasureModalOpen,
  treasureModalType,
  onCloseTreasureModal,
  onCreateTreasure,
  showSuccessNotification,
  isDailyProgressOpen,
  progressTargetDate,
  onCloseDailyProgress,
  onProgressConfirmed,
}: ModalsManagerProps) {
  return (
    <>
      {/* 创建事物模态框 */}
      <CreateLogModal
        isOpen={isCreateLogModalOpen}
        onClose={onCloseCreateLogModal}
        onLogSaved={onLogSaved}
        onAddToTimer={onAddToTimer}
        selectedDate={selectedDate}
      />

      {/* 藏宝阁模态框 */}
      <QuickCreateModal
        isOpen={isTreasureModalOpen}
        type={treasureModalType}
        onClose={onCloseTreasureModal}
        onSubmit={onCreateTreasure}
      />

      {/* 藏宝阁成功通知 */}
      {showSuccessNotification && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <span className="font-medium">宝藏创建成功！</span>
          </div>
        </div>
      )}

      {/* 每日进度审核模态框 */}
      <DailyProgressModal
        isOpen={isDailyProgressOpen}
        onClose={onCloseDailyProgress}
        targetDate={progressTargetDate}
        onConfirmed={onProgressConfirmed}
      />
    </>
  );
}
