'use client';

import React, { useState, useEffect } from 'react';

interface CacheStats {
  totalUsers: number;
  totalTweets: number;
  validTweets: number;
  expiredTweets: number;
}

const TwitterCacheManager = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/twitter/cache');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        setMessage('获取缓存统计失败: ' + data.error);
      }
    } catch (error) {
      setMessage('获取缓存统计失败: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const cleanCache = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/twitter/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clean' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ ' + data.message);
        setStats(data.stats);
      } else {
        setMessage('❌ 清理缓存失败: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ 清理缓存失败: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Twitter 缓存管理</h1>
      
      {/* 缓存统计 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">缓存统计</h2>
        
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">总用户数</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalTweets}</div>
              <div className="text-sm text-gray-600">总推文数</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.validTweets}</div>
              <div className="text-sm text-gray-600">有效推文</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.expiredTweets}</div>
              <div className="text-sm text-gray-600">过期推文</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">缓存操作</h2>
        
        <div className="flex gap-4">
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            🔄 刷新统计
          </button>
          
          <button
            onClick={cleanCache}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '清理中...' : '🗑️ 清理过期缓存'}
          </button>
        </div>
      </div>

      {/* 消息显示 */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* 缓存说明 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">缓存说明</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>缓存策略</strong>: Twitter数据缓存1小时，减少API调用</li>
          <li><strong>自动清理</strong>: 过期数据会自动从数据库中删除</li>
          <li><strong>缓存命中</strong>: 优先返回缓存数据，提高响应速度</li>
          <li><strong>API降级</strong>: API失败时使用模拟数据确保功能可用</li>
          <li><strong>数据一致性</strong>: 缓存数据与Twitter API保持同步</li>
        </ul>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">💡 使用建议</h3>
          <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm">
            <li>定期清理过期缓存以保持数据库性能</li>
            <li>监控缓存命中率以优化缓存策略</li>
            <li>在API限制期间依赖缓存数据</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TwitterCacheManager;
