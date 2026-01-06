'use client';

import React, { useState, useEffect } from 'react';
import { safeFetchJSON, safePostJSON } from '@/lib/fetch-utils';

const TwitterDebug = () => {
  const [debugData, setDebugData] = useState<{
    userApi?: { status: number; data: unknown };
    tweetsApi?: { status: number; data: unknown };
    error?: string;
    cacheStats?: unknown;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        // 测试用户API
        const userData = await safePostJSON('/api/twitter', { username: 'elonmusk' }, 0);

        // 测试推文API
        const tweetsData = await safeFetchJSON('/api/twitter?userId=2244994945&maxResults=3', {}, 0);

        setDebugData({
          userApi: {
            status: 200,
            data: userData
          },
          tweetsApi: {
            status: 200,
            data: tweetsData
          }
        });
      } catch (error) {
        setDebugData({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    fetchDebugData();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Twitter API 调试信息</h3>
      <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded">
        {JSON.stringify(debugData, null, 2)}
      </pre>
    </div>
  );
};

export default TwitterDebug;



