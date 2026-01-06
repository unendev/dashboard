'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { safePostJSON, safeParseJSON } from '@/lib/fetch-utils';

interface DailyProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string; // 要分析的日期（前一天）
  onConfirmed: () => void;
}

export default function DailyProgressModal({
  isOpen,
  onClose,
  targetDate,
  onConfirmed,
}: DailyProgressModalProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [refining, setRefining] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  const analyzeProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await safePostJSON('/api/progress/analyze', { targetDate }, 0);
      setProgress(data as Record<string, unknown>);
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : '分析失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    if (isOpen && !progress) {
      analyzeProgress();
    }
  }, [isOpen, progress, analyzeProgress]);

  const handleRefine = async () => {
    if (!userFeedback.trim()) return;

    setRefining(true);
    try {
      const updated = await safePostJSON('/api/progress/refine', {
        progressId: progress?.id,
        userFeedback,
      }, 0);
      setProgress(updated as Record<string, unknown>);
      setUserFeedback('');
    } catch (error) {
      console.error('Refine failed:', error);
    } finally {
      setRefining(false);
    }
  };

  const handleConfirm = async () => {
    if (!progress?.id) return;
    
    setConfirming(true);
    try {
      await safePostJSON('/api/progress/confirm', {
        progressId: progress.id,
        userNotes,
      }, 0);
      onConfirmed();
      handleClose();
    } catch (error) {
      console.error('Confirm failed:', error);
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setProgress(null);
    setError(null);
    setUserFeedback('');
    setUserNotes('');
    onClose();
  };

  if (!isOpen) return null;

  const analysis = progress?.aiAnalysis as Record<string, unknown> | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold">📊 {targetDate} 进度分析</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading && <div className="text-center py-12">⏳ AI 正在分析...</div>}

          {error && (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">❌ {error}</div>
              <button
                onClick={analyzeProgress}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔄 重新分析
              </button>
            </div>
          )}

          {analysis && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2">总投入: {((analysis as Record<string, unknown>)?.totalHours as number || 0).toFixed(1)}小时</h3>
              </div>

              <div>
                <h4 className="font-semibold mb-3">🤖 AI 分析</h4>
                <div className="space-y-3">
                  {((analysis as Record<string, unknown>)?.taskAnalyses as Array<Record<string, unknown>>)?.map((task: Record<string, unknown>, i: number) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded p-3">
                      <div className="font-medium">{task.taskName as string}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        技能: {(task.extractedSkills as string[])?.join(', ') || ''}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        成长: {task.growthType as string} ({task.actionType as string})
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{task.reasoning as string}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">✨ AI 洞察</h4>
                <ul className="space-y-1">
                  {((analysis as Record<string, unknown>)?.insights as string[])?.map((insight: string, i: number) => (
                    <li key={i} className="text-gray-700 dark:text-gray-300">• {insight}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-4">
                <label className="block font-medium mb-2">💬 对分析有什么反馈？</label>
                <textarea
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                  placeholder="比如：JWT认证只是跟着教程做的，不算真正掌握..."
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={3}
                />
                <button
                  onClick={handleRefine}
                  disabled={refining || !userFeedback.trim()}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {refining ? '调整中...' : '提交反馈'}
                </button>
              </div>

              <div>
                <label className="block font-medium mb-2">💭 今天有什么感悟？</label>
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        {progress && (
          <div className="px-6 py-4 border-t flex justify-end space-x-3">
            <button onClick={handleClose} className="px-6 py-2 hover:bg-gray-100 rounded">
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {confirming ? '确认中...' : '✅ 确认存档'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


