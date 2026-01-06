'use client'

import React from 'react';
import useSWR from 'swr'; // 引入 useSWR

interface LogEntry {
  category: string;
  subcategory: string;
  content: string;
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const LogDisplayTable: React.FC = () => {
  const { data: logs, error } = useSWR<LogEntry[]>('/api/logs', fetcher, { refreshInterval: 5000 }); // 每5秒自动刷新一次

  if (error) {
    return <div className="text-red-500">错误: {error.message}</div>;
  }

  if (!logs) {
    return <div>加载日志中...</div>;
  }

  return (
    <div className="card mt-8">
      <h2>最近日志</h2>
      {logs.length === 0 ? (
        <p>暂无日志记录。</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 mt-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分类
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                子分类
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                内容
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                时间
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.subcategory}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {typeof window !== 'undefined' ? new Date(log.timestamp).toLocaleString() : log.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LogDisplayTable;



