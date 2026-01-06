'use client';

interface UserStatsOverviewProps {
  stats: {
    completed: number;
    favorited: number;
    favoriteTheme: string;
  };
}

export default function UserStatsOverview({ stats }: UserStatsOverviewProps) {
  return (
    <div className="card-mystery p-4 rounded-lg text-sm text-[rgb(var(--color-mystery-ink))] dark:text-[rgb(var(--color-mystery-ink-dark))]">
      <p>
        <span className="font-semibold">已完成:</span> {stats.completed} |{' '}
        <span className="font-semibold">已收藏:</span> {stats.favorited} |{' '}
        <span className="font-semibold">最爱主题:</span> {stats.favoriteTheme}
      </p>
    </div>
  );
}
