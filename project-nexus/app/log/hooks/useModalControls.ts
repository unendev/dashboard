'use client'

import { useState, useCallback } from 'react';
import { CreateTreasureData } from '@/app/components/shared/QuickCreateModal';

/**
 * 模态框控制 Hook
 * 
 * 职责：
 * - 管理所有模态框的打开/关闭状态
 * - 提供统一的模态框控制接口
 * - 处理藏宝阁创建逻辑
 */
export function useModalControls() {
  // ============ 创建事物模态框 ============
  const [isCreateLogModalOpen, setIsCreateLogModalOpen] = useState(false);
  
  const openCreateLogModal = useCallback(() => {
    setIsCreateLogModalOpen(true);
  }, []);
  
  const closeCreateLogModal = useCallback(() => {
    setIsCreateLogModalOpen(false);
  }, []);
  
  // ============ 藏宝阁模态框 ============
  const [isTreasureModalOpen, setIsTreasureModalOpen] = useState(false);
  const [treasureModalType, setTreasureModalType] = useState<'TEXT' | 'IMAGE'>('TEXT');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  
  const openTreasureModal = useCallback((type: 'TEXT' | 'IMAGE') => {
    setTreasureModalType(type);
    setIsTreasureModalOpen(true);
  }, []);
  
  const closeTreasureModal = useCallback(() => {
    setIsTreasureModalOpen(false);
  }, []);
  
  /**
   * 创建宝藏
   */
  const handleCreateTreasure = useCallback(async (data: CreateTreasureData) => {
    try {
      console.info('[Treasure Create] start', { tagsCount: data.tags?.length ?? 0 });
      const response = await fetch('/api/treasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('[Treasure Create] failed', {
          status: response.status,
          error: responseBody
        });
        throw new Error('创建宝藏失败');
      }

      console.info('[Treasure Create] success', { id: responseBody?.id });

      if (responseBody?.id) {
        try {
          console.info('[AI Tagging] trigger', { treasureId: responseBody.id });
          const aiResponse = await fetch(`/api/treasures/${responseBody.id}/ai-tag`, { method: 'POST' });
          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('[AI Tagging] failed', {
              treasureId: responseBody.id,
              status: aiResponse.status,
              error: errorText
            });
          } else {
            const aiResult = await aiResponse.json().catch(() => null);
            console.info('[AI Tagging] completed', {
              treasureId: responseBody.id,
              tagsCount: Array.isArray(aiResult?.tags) ? aiResult.tags.length : 0,
              fallback: !!aiResult?.fallback
            });
          }
        } catch (error) {
          console.error('[AI Tagging] error', { treasureId: responseBody.id, error });
        }
      } else {
        console.warn('[AI Tagging] skipped, missing treasure id');
      }

      // 显示成功通知
      setShowSuccessNotification(true);
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
    } catch (error) {
      console.error('Error creating treasure:', error);
      throw error;
    }
  }, []);
  
  // ============ 每日进度模态框 ============
  const [isDailyProgressOpen, setIsDailyProgressOpen] = useState(false);
  const [progressTargetDate, setProgressTargetDate] = useState('');
  
  /**
   * 打开每日进度审核（分析前一天）
   */
  const openDailyProgress = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    setProgressTargetDate(dateStr);
    setIsDailyProgressOpen(true);
  }, []);
  
  const closeDailyProgress = useCallback(() => {
    setIsDailyProgressOpen(false);
  }, []);
  
  /**
   * 进度确认后的回调
   */
  const handleProgressConfirmed = useCallback(() => {
    alert('✅ 进度已成功存档！');
  }, []);
  
  // ============ 其他功能 ============
  
  /**
   * 日志保存回调
   */
  const handleLogSaved = useCallback(() => {
    // 可以在这里添加日志保存后的逻辑
  }, []);
  
  /**
   * 每周回顾（占位）
   */
  const handleOpenWeeklyReview = useCallback(() => {
    alert('📊 每周回顾功能正在开发中...');
  }, []);
  
  // ============ 返回值 ============
  return {
    // 创建事物模态框
    isCreateLogModalOpen,
    openCreateLogModal,
    closeCreateLogModal,
    handleLogSaved,
    
    // 藏宝阁模态框
    isTreasureModalOpen,
    treasureModalType,
    openTreasureModal,
    closeTreasureModal,
    handleCreateTreasure,
    showSuccessNotification,
    
    // 每日进度模态框
    isDailyProgressOpen,
    progressTargetDate,
    openDailyProgress,
    closeDailyProgress,
    handleProgressConfirmed,
    
    // 其他
    handleOpenWeeklyReview,
  };
}
