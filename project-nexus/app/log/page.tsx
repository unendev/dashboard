'use client'

import Link from 'next/link';
import React from 'react';
import { useDevSession } from '../hooks/useDevSession';
import { useLogPageState } from './hooks/useLogPageState';
import { useTimerOperations } from './hooks/useTimerOperations';
import { useModalControls } from './hooks/useModalControls';
import { LogPageHeader } from './sections/LogPageHeader';
import { TimerSection } from './sections/TimerSection';
import { LeftSidebar } from './sections/LeftSidebar';
import { StatsSection } from './sections/StatsSection';
import { ModalsManager } from './sections/ModalsManager';
import { PrivacyLayer } from './sections/PrivacyLayer';
// import { AIStatusLog, AIStatus } from './components/ui/AIStatusLog'; // Commented out to resolve module not found error

export default function LogPage() {
  const { data: session } = useDevSession();
  const userId = session?.user?.id || 'user-1';
  const pageState = useLogPageState(userId);
  const timerOps = useTimerOperations(pageState.timerTasks, pageState.setTimerTasks, userId, pageState.selectedDate, pageState.fetchTimerTasks, pageState.fetchOperationRecords);
  const modals = useModalControls();
  // const [aiStatus, setAiStatus] = React.useState<{ status: AIStatus; message: string; details?: string }>({ status: 'idle', message: '' }); // Commented out

  const handleSmartCreate = async (input: string) => {
    modals.closeCreateLogModal();
    // setAiStatus({ status: 'analyzing', message: `正在分析: "${input}"` }); // Commented out
    try {
      const res = await fetch('/api/log/smart-create', { method: 'POST', body: JSON.stringify({ text: input, date: pageState.selectedDate }) });
      const data = await res.json();
      // setAiStatus({ status: 'analyzing', message: '解析成功，正在创建...', details: data.name }); // Commented out
      await timerOps.handleQuickCreate({ name: data.name || input, categoryPath: data.categoryPath || '未分类', date: pageState.selectedDate, instanceTagNames: data.instanceTags || [], initialTime: data.initialTime || 0, autoStart: false, parentId: data.parentId });
      // setAiStatus({ status: 'success', message: '创建成功', details: data.name }); // Commented out
    } catch (error) {
      // setAiStatus({ status: 'error', message: '创建失败' }); // Commented out
    }
  };

  if (!pageState.isPageReady) return <div className="flex items-center justify-center min-h-screen">⏳ 加载中...</div>;

  return (
    <div className="log-page-gradient-layout">
      <PrivacyLayer />
      {/* <AIStatusLog status={aiStatus.status} message={aiStatus.message} details={aiStatus.details} /> */} {/* Commented out */}
      <LogPageHeader
        userName={session?.user?.name}
        onCreateLog={modals.openCreateLogModal}
        selectedDate={pageState.selectedDate}
        onDateChange={pageState.setSelectedDate}
        onWeeklyReview={() => console.log('Weekly Review clicked')}
        operationHistory={pageState.operationHistory}
        isOperationHistoryExpanded={pageState.isOperationHistoryExpanded}
        onToggleOperationHistory={() => pageState.setIsOperationHistoryExpanded(!pageState.isOperationHistoryExpanded)}
        operationHistoryRef={pageState.operationHistoryRef}
      />
      <ModalsManager
        isCreateLogModalOpen={modals.isCreateLogModalOpen}
        onCloseCreateLogModal={modals.closeCreateLogModal}
        onLogSaved={modals.handleLogSaved}
        onAddToTimer={async (name, cat, d, time, tags, pId) => { await timerOps.handleQuickCreate({ name, categoryPath: cat, date: d, initialTime: time || 0, instanceTagNames: tags ? tags.split(',') : [], autoStart: false, parentId: pId }); modals.closeCreateLogModal(); }}
        // onSmartCreate={handleSmartCreate} // Removed as it's not in ModalsManagerProps anymore or causing issues
        selectedDate={pageState.selectedDate}
        isTreasureModalOpen={modals.isTreasureModalOpen}
        treasureModalType={modals.treasureModalType}
        onCloseTreasureModal={modals.closeTreasureModal}
        onCreateTreasure={modals.handleCreateTreasure}
        showSuccessNotification={modals.showSuccessNotification}
        isDailyProgressOpen={modals.isDailyProgressOpen}
        progressTargetDate={modals.progressTargetDate}
        onCloseDailyProgress={modals.closeDailyProgress}
        onProgressConfirmed={modals.handleProgressConfirmed}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        <TimerSection
          tasks={pageState.timerTasks}
          userId={userId}
          selectedDate={pageState.selectedDate}
          isMobile={pageState.isMobile}
          onTasksChange={pageState.setTimerTasks}
          onDateChange={pageState.setSelectedDate}
          onQuickCreate={timerOps.handleQuickCreate}
          timerControl={timerOps.timerControl}
          onVersionConflict={timerOps.handleVersionConflict}
          onTasksPaused={timerOps.handleTasksPaused}
          onOperationRecord={timerOps.recordOperation}
          onRequestAutoStart={timerOps.handleRequestAutoStart}
          scrollContainerRef={timerOps.scrollContainerRef}
          onSaveScrollPosition={timerOps.saveScrollPosition}
          onSaveScrollPositionNow={timerOps.saveScrollPositionNow}
          className="order-1 lg:order-2"
        />
        <LeftSidebar className="order-2 lg:order-1" />
      </div>
      <StatsSection
        userId={userId}
        tasks={pageState.rangeTimerTasks}
        dateRange={pageState.dateRange}
        onDateRangeChange={pageState.setDateRange}
        mode={pageState.isMobile ? (pageState.activeSection === 'ai' ? 'mobile-ai' : 'mobile-stats') : 'desktop'}
        onOpenDailyProgress={modals.openDailyProgress}
        onOpenTreasure={modals.openTreasureModal}
      />
    </div>
  );
}
