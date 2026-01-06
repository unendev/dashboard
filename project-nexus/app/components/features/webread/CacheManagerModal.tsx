'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, HardDrive, Clock, Calendar } from 'lucide-react';
import * as ebookCache from '@/lib/ebook-cache';

interface CacheManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCacheUpdated?: () => void;
}

export default function CacheManagerModal({
  isOpen,
  onClose,
  onCacheUpdated,
}: CacheManagerModalProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ebookCache.CacheStats | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 加载缓存统计
  const loadStats = async () => {
    setLoading(true);
    try {
      const cacheStats = await ebookCache.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('加载缓存统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  // 删除单本书籍
  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('确定要删除这本书的缓存吗？')) {
      return;
    }

    setDeleting(bookId);
    try {
      await ebookCache.deleteBook(bookId);
      await loadStats();
      onCacheUpdated?.();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDeleting(null);
    }
  };

  // 清空所有缓存
  const handleClearAll = async () => {
    if (!confirm('确定要清空所有缓存吗？这将删除所有已缓存的书籍。')) {
      return;
    }

    setLoading(true);
    try {
      await ebookCache.clearAllBooks();
      await loadStats();
      onCacheUpdated?.();
      alert('已清空所有缓存');
    } catch (error) {
      console.error('清空缓存失败:', error);
      alert('清空失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (!isOpen) return null;

  const maxSize = ebookCache.getMaxCacheSize();
  const usagePercent = stats ? (stats.totalSize / maxSize) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <HardDrive className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">缓存管理</h2>
              <p className="text-sm text-gray-500">管理本地缓存的电子书</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 容量统计 */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              总占用空间
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {stats ? ebookCache.formatFileSize(stats.totalSize) : '0 B'} / {ebookCache.formatFileSize(maxSize)}
            </span>
          </div>
          
          {/* 进度条 */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                usagePercent > 90
                  ? 'bg-red-500'
                  : usagePercent > 70
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {usagePercent.toFixed(1)}% 已使用
            </span>
            <span className="text-xs text-gray-500">
              {stats?.totalBooks || 0} 本书籍
            </span>
          </div>
        </div>

        {/* 书籍列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">加载中...</span>
            </div>
          ) : stats && stats.books.length > 0 ? (
            <div className="space-y-3">
              {stats.books
                .sort((a, b) => b.lastAccessAt.getTime() - a.lastAccessAt.getTime())
                .map((book) => (
                  <div
                    key={book.bookId}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate mb-2">
                          {book.title}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <div className="flex items-center">
                            <HardDrive className="h-3 w-3 mr-1" />
                            <span>{ebookCache.formatFileSize(book.fileSize)}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>访问：{formatDate(book.lastAccessAt)}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>缓存：{formatDate(book.cachedAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteBook(book.bookId)}
                        disabled={deleting === book.bookId}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="删除缓存"
                      >
                        {deleting === book.bookId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <HardDrive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无缓存
              </h3>
              <p className="text-gray-500">
                打开书籍阅读后会自动缓存到本地
              </p>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <p>缓存使用 IndexedDB 技术</p>
              <p>首次打开书籍会自动缓存，后续访问直接从本地读取</p>
            </div>
            
            {stats && stats.books.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                清空所有缓存
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

