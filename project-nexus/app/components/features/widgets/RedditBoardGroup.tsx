'use client';

import React, { useState, useMemo } from 'react';
import { RedditPost } from '@/types/reddit';
import CompactPostList from './CompactPostList';

interface RedditBoardGroupProps {
  posts: RedditPost[];
  onPostClick: (post: RedditPost) => void;
}

interface BoardStats {
  total: number;
  highValue: number;
}

const RedditBoardGroup: React.FC<RedditBoardGroupProps> = ({ posts, onPostClick }) => {
  // 板块配置
  const boardConfigs = {
    technology: { name: 'Technology', icon: '💻', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30' },
    gamedev: { name: 'Game Dev', icon: '🎮', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30' },
    godot: { name: 'Godot Engine', icon: '🎯', color: 'from-green-500/20 to-emerald-500/20 border-green-500/30' },
  };

  // 初始化所有板块为展开状态
  const [expandedBoards, setExpandedBoards] = useState<Record<string, boolean>>({
    technology: true,
    gamedev: true,
    godot: true,
  });

  // 按板块分组
  const groupedPosts = useMemo(() => {
    const groups: Record<string, RedditPost[]> = {
      technology: [],
      gamedev: [],
      godot: [],
      other: [],
    };

    posts.forEach(post => {
      const subreddit = post.subreddit?.toLowerCase() || 'other';
      if (groups[subreddit]) {
        groups[subreddit].push(post);
      } else {
        groups.other.push(post);
      }
    });

    // 按时间倒序排列
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        // 假设有timestamp字段，否则保持原顺序
        return 0;
      });
    });

    return groups;
  }, [posts]);

  // 计算板块统计
  const getBoardStats = (boardPosts: RedditPost[]): BoardStats => {
    return {
      total: boardPosts.length,
      highValue: boardPosts.filter(p => p.analysis.value_assessment === '高').length,
    };
  };

  // 切换展开/折叠
  const toggleBoard = (board: string) => {
    setExpandedBoards(prev => ({
      ...prev,
      [board]: !prev[board],
    }));
  };

  return (
    <div className="space-y-4">
      {Object.entries(boardConfigs).map(([key, config]) => {
        const boardPosts = groupedPosts[key] || [];
        const stats = getBoardStats(boardPosts);
        const isExpanded = expandedBoards[key];

        if (boardPosts.length === 0) return null;

        return (
          <div
            key={key}
            className={`rounded-xl overflow-hidden bg-gradient-to-br ${config.color} border`}
          >
            {/* 板块头部 */}
            <div
              onClick={() => toggleBoard(key)}
              className="flex items-center justify-between p-4 cursor-pointer 
                         hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {config.name}
                    <span className="text-sm font-normal text-white/60">
                      r/{key}
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-white/60 mt-1">
                    <span>共 {stats.total} 篇</span>
                    {stats.highValue > 0 && (
                      <span className="text-green-400">
                        ⭐ {stats.highValue} 篇高价值
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 展开/折叠图标 */}
              <div className="flex-shrink-0">
                <svg
                  className={`w-6 h-6 text-white/60 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* 板块内容 */}
            {isExpanded && (
              <div className="px-4 pb-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                <CompactPostList
                  posts={boardPosts}
                  onPostClick={onPostClick}
                  source="reddit"
                />
              </div>
            )}
          </div>
        );
      })}

      {/* 其他板块 */}
      {groupedPosts.other && groupedPosts.other.length > 0 && (
        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-gray-500/30">
          <div
            onClick={() => toggleBoard('other')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📂</span>
              <div>
                <h3 className="text-lg font-bold text-white">其他板块</h3>
                <p className="text-xs text-white/60 mt-1">
                  共 {groupedPosts.other.length} 篇
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <svg
                className={`w-6 h-6 text-white/60 transition-transform duration-200 ${
                  expandedBoards.other ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {expandedBoards.other && (
            <div className="px-4 pb-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              <CompactPostList
                posts={groupedPosts.other}
                onPostClick={onPostClick}
                source="reddit"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RedditBoardGroup;

