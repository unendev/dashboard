import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getUser } from '@/lib/auth-token';
import TaskChartDialog from '@/components/features/chart/TaskChartDialog';

type ChartMode = 'task' | 'tag' | 'category';

export default function ChartPage() {
  const location = useLocation();
  const user = getUser();
  const userId = user?.id;

  const params = useMemo(() => {
    const search = location.search || '';
    const query = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const mode = (query.get('mode') || 'task') as ChartMode;
    const value = query.get('value') || '';
    const title = query.get('title') || '统计';
    const custom = query.get('custom') === '1';
    return { mode, value, title, custom };
  }, [location.search]);

  if (!params.value) {
    return (
      <div className="w-full h-full bg-zinc-900 text-zinc-400 flex items-center justify-center text-sm">
        缺少统计参数
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <TaskChartDialog
        mode={params.mode}
        filterValue={params.value}
        title={params.title}
        userId={userId}
        onClose={() => window.close()}
        variant="window"
        allowCustomize={params.custom}
      />
    </div>
  );
}
