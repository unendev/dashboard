'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import { EnhancedInstanceTagInput } from '@/app/components/shared/EnhancedInstanceTagInput';
import { parseTimeToSeconds, loadAutoStartPreference, saveAutoStartPreference } from '@/lib/timer-utils';

export interface QuickCreateData {
  name: string;
  categoryPath: string;
  instanceTagNames: string[];
  initialTime: number;
  autoStart: boolean;
  date?: string;
}

interface QuickCreateDialogProps {
  visible: boolean;
  type: 'category' | 'clone';
  categoryPath: string;
  lastCategoryName?: string; // 【新增】最后一层分类名
  instanceTag?: string | null;
  sourceName?: string;
  userId?: string;
  onClose: () => void;
  onCreate: (data: QuickCreateData) => Promise<void>;
}

const QuickCreateDialog: React.FC<QuickCreateDialogProps> = ({
  visible,
  type,
  categoryPath,
  lastCategoryName, // 【新增】
  instanceTag,
  sourceName,
  userId = 'user-1',
  onClose,
  onCreate
}) => {
  const [mode, setMode] = useState<'ai' | 'form'>('form');
  const [taskName, setTaskName] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [initialTime, setInitialTime] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [autoStart, setAutoStart] = useState(true);

  // 初始化模式和数据
  useEffect(() => {
    if (visible) {
      // 加载上次使用的模式
      const savedMode = localStorage.getItem('timer-create-mode') as 'ai' | 'form';
      if (savedMode) setMode(savedMode);

      // 加载自动计时偏好
      setAutoStart(loadAutoStartPreference());

      if (type === 'clone' && sourceName) {
        // 复制模式：使用原任务名 + " - 副本"
        setTaskName(`${sourceName} - 副本`);
      } else if (instanceTag) {
        // 事物项标签模式：使用事物项作为默认任务名
        setTaskName(instanceTag);
      } else {
        // 分类创建模式：保持为空，使用 placeholder 提示
        setTaskName('');
      }

      // 设置标签
      if (instanceTag) {
        setSelectedTags([instanceTag]);
      } else {
        setSelectedTags([]);
      }

      setInitialTime('');
    }
  }, [visible, type, sourceName, lastCategoryName, instanceTag]);

  const handleModeChange = (newMode: 'ai' | 'form') => {
    setMode(newMode);
    localStorage.setItem('timer-create-mode', newMode);
  };

  const handleAiSubmit = async () => {
    const input = aiInput.trim();
    if (!input) return;

    // 📝 [AI智能创建] 日志：开始解析
    console.log('🤖 [AI智能创建] 开始解析输入:', input);

    // 立即关闭对话框并清空输入，提升用户体验
    onClose();
    setAiInput('');

    setIsParsing(true);
    try {
      const response = await fetch('/api/timer-tasks/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [AI智能创建] API 响应错误:', response.status, errorText);
        throw new Error('AI 解析失败');
      }

      const parsed = await response.json();

      // 📝 [AI智能创建] 日志：解析结果
      console.log('✅ [AI智能创建] 解析成功:', parsed);
      console.log('🔍 [AI智能创建] Tags check:', {
        instanceTags: parsed.instanceTags,
        isArray: Array.isArray(parsed.instanceTags),
        length: parsed.instanceTags?.length
      });

      // 保存偏好
      saveAutoStartPreference(autoStart);

      const createData = {
        name: parsed.name,
        categoryPath: parsed.categoryPath,
        instanceTagNames: parsed.instanceTags && parsed.instanceTags.length > 0 ? [parsed.instanceTags[0]] : [],
        initialTime: 0,
        autoStart
      };
      console.log('🚀 [AI Create Debug] Parsed Data:', {
        parsedName: parsed.name,
        parsedTags: parsed.instanceTags,
        usedTags: parsed.instanceTags && parsed.instanceTags.length > 0 ? [parsed.instanceTags[0]] : [],
        originalInput: aiInput
      });

      await onCreate(createData);

    } catch (error) {
      console.error('❌ [AI智能创建] 过程出错:', error);
      // 由于对话框已关闭，这里可以通过 toast 或控制台告知用户
      console.error('AI 解析或任务创建失败，请检查网络或尝试手动模式');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'ai') {
      await handleAiSubmit();
      return;
    }

    // 获取最终的任务名：用户输入或使用分类名
    const finalTaskName = taskName.trim() || lastCategoryName || '';

    if (!finalTaskName.trim()) {
      alert('请输入任务名称或先选择分类');
      return;
    }

    // 保存自动计时偏好
    saveAutoStartPreference(autoStart);

    // 保存表单数据（在重置前保存，用于错误恢复）
    const savedTaskName = taskName;
    const savedInitialTime = initialTime;
    const savedSelectedTags = [...selectedTags];
    const parsedInitialTime = parseTimeToSeconds(initialTime);

    // 重置表单（在提交前重置，避免重复提交）
    setTaskName('');
    setInitialTime('');
    setSelectedTags([]);

    // 立即关闭对话框（乐观更新，不等待 API）
    onClose();

    // 异步创建任务（不阻塞 UI）
    // 🚀 [Aggressive Debug] Check manual creation data
    console.log('🚀 [Manual Create Debug] State:', {
      taskName,
      finalTaskName,
      selectedTags,
      savedSelectedTags,
      instanceTagNames: savedSelectedTags
    });

    // 异步创建任务（不阻塞 UI）
    const manualCreateData = {
      name: finalTaskName,
      categoryPath,
      instanceTagNames: savedSelectedTags,
      initialTime: parsedInitialTime,
      autoStart
    };
    console.log('🚀 [Manual Create] Calling onCreate with:', manualCreateData);

    onCreate(manualCreateData).catch((error) => {
      console.error('创建任务失败:', error);
      // 失败时显示错误提示，但不阻止对话框关闭
      alert(`任务创建失败: ${error instanceof Error ? error.message : '未知错误'}\n\n请检查网络连接后重试`);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 计算任务名 placeholder
  const taskNamePlaceholder = type === 'clone'
    ? '输入新的任务名称（或保持不变）'
    : lastCategoryName
      ? `输入任务名称（默认使用：${lastCategoryName}）`
      : '输入任务名称';

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            {type === 'clone' ? '复制任务' : '快速创建'}
          </DialogTitle>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <Button
              size="sm"
              variant={mode === 'ai' ? 'default' : 'ghost'}
              className={`text-xs h-7 px-3 rounded-md ${mode === 'ai' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
              onClick={() => handleModeChange('ai')}
            >
              AI
            </Button>
            <Button
              size="sm"
              variant={mode === 'form' ? 'default' : 'ghost'}
              className={`text-xs h-7 px-3 rounded-md ${mode === 'form' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
              onClick={() => handleModeChange('form')}
            >
              表单
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === 'ai' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  自然语言输入
                  {isParsing && <span className="animate-pulse text-blue-500 text-[10px]">解析中...</span>}
                </label>
                <Input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isParsing) {
                      e.preventDefault();
                      handleAiSubmit();
                    }
                  }}
                  placeholder="如：蓄能、修环境变量 技术琐项 #项目..."
                  className="h-12 text-lg border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  autoFocus
                  disabled={isParsing}
                />
                <div className="text-[11px] text-gray-400 space-y-1">
                  <p>提示：AI 会根据分类体系自动识别</p>
                  <p className="flex gap-2">
                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 rounded cursor-pointer hover:bg-gray-200" onClick={() => setAiInput('蓄能')}>"蓄能"</span>
                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 rounded cursor-pointer hover:bg-gray-200" onClick={() => setAiInput('修环境 技术琐项 #Nexus')}>"修环境 技术琐项 #Nexus"</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* 原任务信息（仅复制模式） */}
              {type === 'clone' && sourceName && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-medium">复制自：</span>{sourceName}
                  </p>
                </div>
              )}

              {/* 分类路径（只读） */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  分类路径
                </label>
                <Input
                  value={categoryPath || '未分类'}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                />
              </div>

              {/* 任务名称 */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  任务名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={taskNamePlaceholder}
                  className="mt-1"
                  autoFocus
                />
              </div>

              {/* 初始时间 */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  初始时间 <span className="text-gray-500 font-normal">(可选)</span>
                </label>
                <Input
                  value={initialTime}
                  onChange={(e) => setInitialTime(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="如: 30m, 1h20m, 2h"
                  className="mt-1"
                />
              </div>

              {/* 事物项标签 */}
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  事务项 (可选)
                </label>
                {selectedTags.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-gray-500 hover:text-red-500 h-auto px-2 py-1"
                  >
                    清空
                  </Button>
                )}
              </div>
              <EnhancedInstanceTagInput
                tags={selectedTags}
                onChange={(tags) => setSelectedTags(tags.slice(0, 1))} // Ensure max 1 tag
                userId={userId}
                placeholder="输入事务项..."
                maxTags={1}
              />
            </div>
          )}

          {/* 自动开始计时选项 */}
          <div className="flex items-center space-x-2 pt-2 pb-1 border-t border-gray-100 dark:border-gray-800 mt-2">
            <Checkbox
              id="auto-start"
              checked={autoStart}
              onCheckedChange={(checked) => setAutoStart(checked === true)}
            />
            <label
              htmlFor="auto-start"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
            >
              创建后自动开始计时
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={(mode === 'ai' ? !aiInput.trim() : (!taskName.trim() && !lastCategoryName)) || isParsing}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl px-6 min-w-[120px]"
          >
            {isParsing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                解析中
              </span>
            ) : (
              autoStart ? '⏱️ 创建并开始' : '✅ 创建'
            )}
          </Button>
        </DialogFooter>

        {/* 键盘提示 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pb-2">
          {mode === 'ai' ? '按 Enter 快速解析并创建' : '按 Ctrl/Cmd + Enter 快速创建'}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCreateDialog;

