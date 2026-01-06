'use client';

import React from 'react';
import { LinuxDoPost } from '@/types/linuxdo';
import { RedditPost } from '@/types/reddit';

interface CompactPostListProps {
  posts: (LinuxDoPost | RedditPost)[];
  onPostClick: (post: LinuxDoPost | RedditPost) => void;
  source: 'linuxdo' | 'reddit';
}

const CompactPostList: React.FC<CompactPostListProps> = ({ posts, onPostClick, source }) => {
  const getPostTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '技术问答': 'bg-blue-500/20 text-blue-400',
      '技术讨论': 'bg-blue-500/20 text-blue-400',
      '资源分享': 'bg-green-500/20 text-green-400',
      '新闻资讯': 'bg-purple-500/20 text-purple-400',
      '新闻分享': 'bg-purple-500/20 text-purple-400',
      '教程指南': 'bg-cyan-500/20 text-cyan-400',
      '项目展示': 'bg-pink-500/20 text-pink-400',
      '优惠活动': 'bg-orange-500/20 text-orange-400',
      '问题求助': 'bg-yellow-500/20 text-yellow-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const getValueColor = (value: string) => {
    const colors: Record<string, string> = {
      '高': 'text-green-400',
      '中': 'text-yellow-400',
      '低': 'text-gray-400',
    };
    return colors[value] || 'text-gray-400';
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours < 1) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-2">
      {posts.map((post, index) => (
        <div
          key={post.id}
          onClick={() => onPostClick(post)}
          className="group relative flex items-center gap-3 px-4 py-3 rounded-lg 
                     bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                     cursor-pointer transition-all duration-200 hover:shadow-lg"
        >
          {/* 序号 */}
          <div className="flex-shrink-0 w-8 text-center">
            <span className={`text-sm font-bold ${
              source === 'linuxdo' ? 'text-blue-400' : 'text-orange-400'
            }`}>
              #{index + 1}
            </span>
          </div>

          {/* 主要内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* 类型标签 */}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                getPostTypeColor(post.analysis.post_type)
              }`}>
                {post.analysis.post_type}
              </span>
              
              {/* 价值评估 */}
              <span className={`text-xs font-bold ${
                getValueColor(post.analysis.value_assessment)
              }`}>
                {post.analysis.value_assessment === '高' && '⭐'}
                {post.analysis.value_assessment === '中' && '◆'}
                {post.analysis.value_assessment === '低' && '○'}
              </span>

              {/* Reddit板块标签 */}
              {'subreddit' in post && post.subreddit && (
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs">
                  r/{post.subreddit}
                </span>
              )}
            </div>

            {/* 标题 */}
            <h4 className="text-sm font-medium text-white group-hover:text-white/90 
                          truncate leading-relaxed">
              {post.title}
            </h4>

            {/* 核心问题预览 */}
            {post.analysis.core_issue && (
              <p className="text-xs text-white/50 truncate mt-1">
                {post.analysis.core_issue}
              </p>
            )}
          </div>

          {/* 右侧指示器 */}
          <div className="flex-shrink-0">
            <svg 
              className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}

      {posts.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <p>暂无数据</p>
        </div>
      )}
    </div>
  );
};

export default CompactPostList;

