import React from 'react';
import { MarkdownView } from "@/app/components/shared/MarkdownView";

interface LogActivityInstance {
  id: string;
  name: string;
  duration: string;
}

interface LogSubCategoryInstance {
  id: string;
  name: string;
  activities: LogActivityInstance[];
}

interface LogCategoryInstance {
  id: string;
  name: string;
  subCategories: LogSubCategoryInstance[];
}

interface Log {
  id: string;
  content: string | null;
  createdAt: Date; // Keep createdAt for general log creation time
  timestamp: Date; // New field for specific log entry timestamp
  quest?: {
    id: string;
    title: string;
  } | null;
  categories: LogCategoryInstance[];
}

interface LogCardProps {
  log: Log;
}

export default function LogCard({ log }: LogCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const renderCategories = (categories: LogCategoryInstance[]) => {
    if (!categories || categories.length === 0) {
      return null;
    }

    return (
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.id} className="space-y-2 pl-4 border-l-2 border-purple-300">
            <h4 className="text-md font-medium text-purple-700">{category.name}</h4>
            {Array.isArray(category.subCategories) && category.subCategories.map((subCategory) => (
              <div key={subCategory.id} className="space-y-1 pl-4 border-l border-gray-300">
                <p className="text-sm font-medium text-gray-700">{subCategory.name}</p>
                {Array.isArray(subCategory.activities) && subCategory.activities.map((activity) => (
                  <p key={activity.id} className="text-sm text-gray-700 ml-2">
                    - {activity.name} ({activity.duration})
                  </p>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const hasCategoriesContent = log.categories && log.categories.length > 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {log.content && (
            <div className="text-gray-800">
              <MarkdownView content={log.content} variant="light" />
            </div>
          )}
          {!log.content && !hasCategoriesContent && <p className="text-gray-500 italic">无日志内容或每日总结</p>}
        </div>
        <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
          {formatDate(log.timestamp)} {/* Displaying the new timestamp */}
        </span>
      </div>

      {log.quest && (
        <div className="text-sm text-blue-600 mt-2">
          关联任务: {log.quest.title}
        </div>
      )}

      {hasCategoriesContent && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {renderCategories(log.categories)}
        </div>
      )}
    </div>
  );
}