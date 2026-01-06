'use client';

import React, { useState, useEffect } from 'react';
import { RedditReport } from '@/types/reddit';
import Modal from '../../shared/Modal';

interface AvailableDate {
  date: string;
  count: number;
  label: string;
}

interface RedditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RedditModal: React.FC<RedditModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<RedditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'analysis'>('overview');

  // 获取可用日期列表
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await fetch('/api/reddit/dates');
        if (response.ok) {
          const data = await response.json();
          setAvailableDates(data.dates);
        }
      } catch (err) {
        console.error('Failed to fetch available dates:', err);
      }
    };

    fetchAvailableDates();
  }, []);

  // 获取报告数据
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const url = selectedDate ? `/api/reddit?date=${selectedDate}` : '/api/reddit';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch Reddit report');
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedDate]);

  const getValueAssessmentColor = (assessment: string) => {
    switch (assessment) {
      case '高': return 'text-green-400';
      case '中': return 'text-yellow-400';
      case '低': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case '求助': return 'bg-blue-500/20 text-blue-400';
      case '讨论': return 'bg-purple-500/20 text-purple-400';
      case '资源分享': return 'bg-green-500/20 text-green-400';
      case '新闻资讯': return 'bg-orange-500/20 text-orange-400';
      case '日常闲聊': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const tabs = [
    { id: 'overview' as const, label: '概览分析', icon: '📊' },
    { id: 'posts' as const, label: '热门帖子', icon: '🔥' },
    { id: 'analysis' as const, label: '深度分析', icon: '🔍' }
  ];

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Reddit 详细报告">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
            <div className="text-white/60">加载 Reddit 报告中...</div>
          </div>
        </div>
      </Modal>
    );
  }

  if (error || !report) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Reddit 详细报告">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-red-400">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg font-semibold mb-2">加载失败</div>
            <div className="text-white/60">{error}</div>
          </div>
        </div>
      </Modal>
    );
  }

  const highValuePosts = report.posts.filter(post => post.analysis.value_assessment === '高');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reddit 详细报告">
      {/* 日期选择器 */}
      <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">📅 选择查看日期</h3>
          <div className="text-sm text-white/60">
            当前查看: {selectedDate 
              ? (availableDates.find(d => d.date === selectedDate)?.label || selectedDate)
              : (report?.meta?.report_date 
                  ? new Date(report.meta.report_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })
                  : availableDates[0]?.label || '加载中...')}
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-32 overflow-y-auto">
          <button
            onClick={() => setSelectedDate('')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedDate
                ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
          >
            <div className="font-medium">
              {report?.meta?.report_date 
                ? new Date(report.meta.report_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
                : availableDates[0]?.label || '...'}
            </div>
            <div className="text-xs opacity-60">
              {report?.meta?.report_date 
                ? new Date(report.meta.report_date).toLocaleDateString('zh-CN', { weekday: 'short' })
                : ''}
            </div>
          </button>
          {availableDates.map((dateInfo) => (
            <button
              key={dateInfo.date}
              onClick={() => setSelectedDate(dateInfo.date)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedDate === dateInfo.date
                  ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              <div className="font-medium">{dateInfo.label}</div>
              <div className="text-xs opacity-60">{dateInfo.count}篇</div>
            </button>
          ))}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium tab-transition ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 报告概览 */}
            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                报告概览
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">{report.meta.post_count}</div>
                  <div className="text-sm text-white/60">总帖子数</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{highValuePosts.length}</div>
                  <div className="text-sm text-white/60">高价值帖子</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{report.meta.report_date}</div>
                  <div className="text-sm text-white/60">报告日期</div>
                </div>
              </div>
              <p className="text-white/80 text-lg leading-relaxed">{report.summary.overview}</p>
            </div>

            {/* 社区亮点 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
                <h4 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                  🔥 热门讨论
                </h4>
                <ul className="space-y-3">
                  {report.summary.highlights.tech_savvy.map((item, index) => (
                    <li key={index} className="text-white/70 flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                <h4 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                  💎 优质内容
                </h4>
                <ul className="space-y-3">
                  {report.summary.highlights.resources_deals.map((item, index) => (
                    <li key={index} className="text-white/70 flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                <h4 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                  🌟 热门话题
                </h4>
                <ul className="space-y-3">
                  {report.summary.highlights.hot_topics.map((item, index) => (
                    <li key={index} className="text-white/70 flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 社区感悟 */}
            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
              <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                💭 社区感悟
              </h3>
              <p className="text-white/80 text-lg italic leading-relaxed">&ldquo;{report.summary.conclusion}&rdquo;</p>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">🔥 热门帖子详情</h3>
              <div className="text-sm text-white/60">
                共 {report.posts.length} 篇帖子，其中 {highValuePosts.length} 篇高价值
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {report.posts.map((post, index) => (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-white/5 rounded-xl hover:bg-white/10 modal-card-hover group border border-white/10 hover:border-white/20 h-full flex flex-col"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">
                        #{index + 1}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPostTypeColor(post.analysis.post_type)}`}>
                        {post.analysis.post_type}
                      </span>
                      <span className={`text-xs font-medium ${getValueAssessmentColor(post.analysis.value_assessment)}`}>
                        {post.analysis.value_assessment}价值
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-white group-hover:text-white/90 mb-3 leading-relaxed line-clamp-2">
                      {post.title}
                    </h4>
                    {post.analysis.core_issue && (
                      <p className="text-white/70 mb-3 leading-relaxed text-sm line-clamp-3">
                        {post.analysis.core_issue}
                      </p>
                    )}
                  </div>
                  
                  {post.analysis.key_info && post.analysis.key_info.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-semibold text-white/80 mb-2">关键信息：</h5>
                      <ul className="space-y-1">
                        {post.analysis.key_info.slice(0, 2).map((info, infoIndex) => (
                          <li key={infoIndex} className="text-white/60 text-xs flex items-start gap-2">
                            <span className="text-orange-400 mt-0.5">•</span>
                            <span className="leading-relaxed line-clamp-1">{info}</span>
                          </li>
                        ))}
                        {post.analysis.key_info.length > 2 && (
                          <li className="text-white/40 text-xs">
                            +{post.analysis.key_info.length - 2} 更多...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                      点击查看原帖 →
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                🔍 深度数据分析
              </h3>
              
              {/* Subreddit 分布 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">🏛️ 板块分布统计</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(report.meta?.subreddits || []).map((subreddit) => {
                    const count = report.posts.filter(post => post.subreddit === subreddit).length;
                    const percentage = ((count / report.posts.length) * 100).toFixed(1);
                    return (
                      <div key={subreddit} className="p-3 bg-white/5 rounded-lg border border-orange-500/20">
                        <div className="text-xl font-bold text-orange-400">{count}</div>
                        <div className="text-xs text-white/80 font-medium">r/{subreddit}</div>
                        <div className="text-xs text-white/40">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 帖子类型分布 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">📊 内容类型分布</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {['技术讨论', '新闻分享', '问题求助', '观点讨论', '资源分享', '其他'].map((type) => {
                    const count = report.posts.filter(post => post.analysis.post_type === type).length;
                    if (count === 0) return null;
                    const percentage = ((count / report.posts.length) * 100).toFixed(1);
                    return (
                      <div key={type} className="p-3 bg-white/5 rounded-lg text-center">
                        <div className="text-lg font-bold text-white">{count}</div>
                        <div className="text-xs text-white/60">{type}</div>
                        <div className="text-xs text-white/40">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 价值评估分布 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">⭐ 价值评估分布</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['高', '中', '低'].map((level) => {
                    const count = report.posts.filter(post => post.analysis.value_assessment === level).length;
                    const percentage = ((count / report.posts.length) * 100).toFixed(1);
                    return (
                      <div key={level} className="p-4 bg-white/5 rounded-lg text-center">
                        <div className={`text-2xl font-bold ${getValueAssessmentColor(level)}`}>{count}</div>
                        <div className="text-sm text-white/60">{level}价值</div>
                        <div className="text-xs text-white/40">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 关键信息统计 */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">📝 内容洞察统计</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-orange-400">
                      {report.posts.reduce((sum, post) => sum + (post.analysis.key_info?.length || 0), 0)}
                    </div>
                    <div className="text-sm text-white/60">总关键点数</div>
                    <div className="text-xs text-white/40 mt-1">涵盖所有帖子</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">
                      {(report.posts.reduce((sum, post) => sum + (post.analysis.key_info?.length || 0), 0) / report.posts.length).toFixed(1)}
                    </div>
                    <div className="text-sm text-white/60">平均信息密度</div>
                    <div className="text-xs text-white/40 mt-1">每帖平均关键点</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RedditModal;



