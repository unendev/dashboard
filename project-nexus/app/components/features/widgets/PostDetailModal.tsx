'use client';

import React from 'react';
import rehypeHighlight from 'rehype-highlight';
import { LinuxDoPost } from '@/types/linuxdo';
import { RedditPost } from '@/types/reddit';
import Modal from '../../shared/Modal';
import { MarkdownRenderer } from '@/lib/markdown';

interface PostDetailModalProps {
  post: LinuxDoPost | RedditPost | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigate?: { prev: boolean; next: boolean };
  source?: 'linuxdo' | 'reddit';
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onNavigate,
  canNavigate = { prev: false, next: false },
  source = 'linuxdo'
}) => {
  if (!post) return null;

  const getPostTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '技术问答': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      '技术讨论': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      '资源分享': 'bg-green-500/20 text-green-400 border-green-500/50',
      '新闻资讯': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      '新闻分享': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      '教程指南': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
      '项目展示': 'bg-pink-500/20 text-pink-400 border-pink-500/50',
      '优惠活动': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      '问题求助': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  const getValueBadge = (value: string) => {
    const badges: Record<string, { text: string; className: string }> = {
      '高': { text: '⭐ 高价值', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
      '中': { text: '◆ 中等', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
      '低': { text: '○ 一般', className: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
    };
    return badges[value] || badges['中'];
  };

  const valueBadge = getValueBadge(post.analysis.value_assessment);
  const hasDetailedAnalysis = post.analysis.detailed_analysis && post.analysis.detailed_analysis.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="帖子详情">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex-shrink-0 p-6 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* 标签行 */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  getPostTypeColor(post.analysis.post_type)
                }`}>
                  {post.analysis.post_type}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${valueBadge.className}`}>
                  {valueBadge.text}
                </span>
                {('subreddit' in post) && post.subreddit && (
                  <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs font-medium border border-orange-500/50">
                    r/{post.subreddit}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  source === 'linuxdo' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'
                }`}>
                  {source === 'linuxdo' ? 'Linux.do' : 'Reddit'}
                </span>
              </div>

              {/* 标题 */}
              <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                {post.title}
              </h2>

              {/* 核心问题 */}
              {post.analysis.core_issue && (
                <p className="text-white/70 text-sm leading-relaxed">
                  {post.analysis.core_issue}
                </p>
              )}
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full 
                       bg-white/5 hover:bg-white/10 text-white/60 hover:text-white 
                       transition-colors"
              aria-label="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {hasDetailedAnalysis ? (
            /* 深度分析内容 */
            <div className="markdown-content prose prose-invert max-w-none">
              <MarkdownRenderer
                content={post.analysis.detailed_analysis || ''}
                variant="dark"
                rehypePlugins={[rehypeHighlight]}
              />
            </div>
          ) : (
            /* 降级显示：关键信息列表 */
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span>💡</span>
                  关键信息
                </h3>
                <ul className="space-y-2">
                  {post.analysis.key_info.map((info, index) => (
                    <li key={index} className="flex items-start gap-3 text-white/80">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center 
                                     bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="flex-1">{info}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ℹ️ 深度分析内容暂未生成，请稍后查看或访问原文。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex-shrink-0 p-4 border-t border-white/10 flex items-center justify-between">
          {/* 导航按钮 */}
          {onNavigate && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('prev')}
                disabled={!canNavigate.prev}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:bg-white/5 
                         disabled:opacity-30 disabled:cursor-not-allowed
                         text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                上一篇
              </button>
              <button
                onClick={() => onNavigate('next')}
                disabled={!canNavigate.next}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:bg-white/5 
                         disabled:opacity-30 disabled:cursor-not-allowed
                         text-white rounded-lg transition-colors flex items-center gap-2"
              >
                下一篇
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* 查看原文按钮 */}
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 
                     hover:from-blue-600 hover:to-purple-600
                     text-white font-medium rounded-lg transition-all duration-200 
                     flex items-center gap-2"
          >
            查看原文
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </Modal>
  );
};

export default PostDetailModal;

