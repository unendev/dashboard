'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LinuxDoPost, LinuxDoReport } from '@/types/linuxdo';
import { RedditPost, RedditReport } from '@/types/reddit';
import { HeyboxPost, HeyboxReport } from '@/types/heybox';
import { MarkdownRenderer } from '@/lib/markdown';
import rehypeHighlight from 'rehype-highlight';
import PostTagSelector from '@/app/components/features/widgets/PostTagSelector';

type SourceType = 'all' | 'linuxdo' | 'reddit' | 'heybox';

const ScrollableLayout = () => {
  const [linuxdoData, setLinuxdoData] = useState<LinuxDoReport | null>(null);
  const [redditData, setRedditData] = useState<RedditReport | null>(null);
  const [heyboxData, setHeyboxData] = useState<HeyboxReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPost, setHoveredPost] = useState<(LinuxDoPost | RedditPost | HeyboxPost) | null>(null);
  const [activeSource, setActiveSource] = useState<SourceType>('all');
  const [activeSection, setActiveSection] = useState<string>('linuxdo');
  const [showAIChat, setShowAIChat] = useState(false);
  const [mobileTab, setMobileTab] = useState<'content' | 'tags'>('content'); // 移动端 Tab 状态
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // ✨ 标签相关状态
  const [postTags, setPostTags] = useState<Record<string, string[]>>({});
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [savingTags, setSavingTags] = useState<Set<string>>(new Set());
  
  // 📱 移动端标签栏切换状态
  const [showTagsBar, setShowTagsBar] = useState(false);

  // 🔍 筛选相关状态
  const [selectedUserTag, setSelectedUserTag] = useState<string>(''); // 选中的用户标签
  const [selectedPostType, setSelectedPostType] = useState<string>(''); // 选中的帖子类型
  const [selectedValue, setSelectedValue] = useState<string>(''); // 选中的价值评估

  // 日期选择相关state
  const [selectedLinuxDoDate, setSelectedLinuxDoDate] = useState<string>('');
  const [selectedRedditDate, setSelectedRedditDate] = useState<string>('');
  const [selectedHeyboxDate, setSelectedHeyboxDate] = useState<string>('');
  const [availableLinuxDoDates, setAvailableLinuxDoDates] = useState<Array<{ date: string; count: number; label: string }>>([]);
  const [availableRedditDates, setAvailableRedditDates] = useState<Array<{ date: string; count: number; label: string }>>([]);
  const [availableHeyboxDates, setAvailableHeyboxDates] = useState<Array<{ date: string; count: number; label: string }>>([]);
  const [loadingDates, setLoadingDates] = useState(true);

  // 日期格式化工具函数
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 比较日期（忽略时间）
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (dateOnly.getTime() === todayOnly.getTime()) {
      return `${dateStr} (今天)`;
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return `${dateStr} (昨天)`;
    } else {
      const diffTime = todayOnly.getTime() - dateOnly.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 7) {
        return `${dateStr} (${diffDays}天前)`;
      }
      return dateStr;
    }
  };

  // 获取默认日期
  const getDefaultDate = (type: 'linuxdo' | 'reddit') => {
    const today = new Date();
    if (type === 'linuxdo') {
      // LinuxDo默认昨天
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    } else {
      // Reddit默认今天
      return today.toISOString().split('T')[0];
    }
  };

  // 📌 加载用户标签（页面初始化时）
  useEffect(() => {
    const loadUserTags = async () => {
      try {
        setIsLoadingTags(true);
        const response = await fetch('/api/post-tags');
        
        if (response.ok) {
          const tagsData: Array<{ source: string; postId: string; tags: string[] }> = await response.json();
          console.log('✅ 加载标签成功:', tagsData.length, '条');
          
          // 将数据库返回的标签数组转换为状态格式
          // tagsData 应该是 { tags: string[], source: string, postId: string }[] 格式
          const tagsMap: Record<string, string[]> = {};
          
          if (Array.isArray(tagsData)) {
            tagsData.forEach((item) => {
              if (item.source && item.postId && Array.isArray(item.tags)) {
                const key = `${item.source}-${item.postId}`;
                tagsMap[key] = item.tags;
              }
            });
          }
          
          setPostTags(tagsMap);
        } else {
          console.warn('加载标签失败，状态码:', response.status);
        }
      } catch (error) {
        console.error('加载标签出错:', error);
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadUserTags();
  }, []);

  // 📱 移动端标签栏切换状态
  useEffect(() => {
    const savedShowTagsBar = localStorage.getItem('showTagsBar');
    if (savedShowTagsBar === 'false') {
      setShowTagsBar(false);
    } else {
      setShowTagsBar(true);
    }
  }, []);

  // 获取可用日期列表
  useEffect(() => {
    const fetchDates = async () => {
      try {
        setLoadingDates(true);
        const [linuxdoDatesRes, redditDatesRes, heyboxDatesRes] = await Promise.all([
          fetch('/api/linuxdo/dates'),
          fetch('/api/reddit/dates'),
          fetch('/api/heybox/dates')
        ]);

        if (linuxdoDatesRes.ok) {
          const data = await linuxdoDatesRes.json();
          setAvailableLinuxDoDates(data.dates || []);
          // 设置默认日期
          if (!selectedLinuxDoDate) {
            const defaultDate = getDefaultDate('linuxdo');
            const dateStrings = (data.dates || []).map((d: { date: string }) => d.date);
            setSelectedLinuxDoDate(dateStrings.includes(defaultDate) ? defaultDate : (dateStrings[0] || defaultDate));
          }
        }

        if (redditDatesRes.ok) {
          const data = await redditDatesRes.json();
          setAvailableRedditDates(data.dates || []);
          // 设置默认日期
          if (!selectedRedditDate) {
            const defaultDate = getDefaultDate('reddit');
            const dateStrings = (data.dates || []).map((d: { date: string }) => d.date);
            setSelectedRedditDate(dateStrings.includes(defaultDate) ? defaultDate : (dateStrings[0] || defaultDate));
          }
        }

        if (heyboxDatesRes.ok) {
          const data = await heyboxDatesRes.json();
          setAvailableHeyboxDates(data.dates || []);
          // 设置默认日期（小黑盒用今天）
          if (!selectedHeyboxDate) {
            const defaultDate = new Date().toISOString().split('T')[0];
            const dateStrings = (data.dates || []).map((d: { date: string }) => d.date);
            setSelectedHeyboxDate(dateStrings.includes(defaultDate) ? defaultDate : (dateStrings[0] || defaultDate));
          }
        }
      } catch (error) {
        console.error('Failed to fetch dates:', error);
        // 设置默认日期作为降级
        if (!selectedLinuxDoDate) setSelectedLinuxDoDate(getDefaultDate('linuxdo'));
        if (!selectedRedditDate) setSelectedRedditDate(getDefaultDate('reddit'));
        if (!selectedHeyboxDate) setSelectedHeyboxDate(new Date().toISOString().split('T')[0]);
      } finally {
        setLoadingDates(false);
      }
    };

    fetchDates();
  }, []);

  // 获取数据
  useEffect(() => {
    // 等待日期加载完成
    if (loadingDates) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [linuxdoRes, redditRes, heyboxRes] = await Promise.all([
          fetch(`/api/linuxdo${selectedLinuxDoDate ? `?date=${selectedLinuxDoDate}` : ''}`),
          fetch(`/api/reddit${selectedRedditDate ? `?date=${selectedRedditDate}` : ''}`),
          fetch(`/api/heybox${selectedHeyboxDate ? `?date=${selectedHeyboxDate}` : ''}`)
        ]);

        if (linuxdoRes.ok) {
          const data = await linuxdoRes.json();
          setLinuxdoData(data);
        } else {
          setLinuxdoData(null);
        }

        if (redditRes.ok) {
          const data = await redditRes.json();
          setRedditData(data);
        } else {
          setRedditData(null);
        }

        if (heyboxRes.ok) {
          const data = await heyboxRes.json();
          setHeyboxData(data);
        } else {
          setHeyboxData(null);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLinuxDoDate, selectedRedditDate, selectedHeyboxDate, loadingDates]);

  // 处理点击展开详情
  const handleClick = (post: LinuxDoPost | RedditPost) => {
    setHoveredPost(post);
  };

  // ✨ 保存帖子标签（乐观更新 + 错误回滚）
  const savePostTags = async (postKey: string, newTags: string[], source: 'linuxdo' | 'reddit' | 'heybox', postId: string) => {
    console.log('🔄 [savePostTags] 开始保存', { postKey, count: newTags.length });
    
    // 1. 保存旧状态（用于回滚）
    const oldTags = postTags[postKey] || [];
    
    // 2. 乐观更新 UI
    setPostTags(prev => {
      const next = { ...prev };
      if (newTags.length === 0) {
        delete next[postKey];
      } else {
        next[postKey] = newTags;
      }
      return next;
    });
    
    // 3. 标记为保存中
    setSavingTags(prev => new Set(prev).add(postKey));
    
    // 4. 调用 API
    try {
      const response = await fetch('/api/post-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, postId, tags: newTags }),
      });

      if (!response.ok) {
        throw new Error(`API 失败: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [savePostTags] 保存成功', { deleted: result.deleted, success: result.success });
    } catch (error) {
      console.error('❌ [savePostTags] 保存失败，回滚状态', error);
      
      // 5. 失败时回滚到旧状态
      setPostTags(prev => {
        const next = { ...prev };
        if (oldTags.length === 0) {
          delete next[postKey];
        } else {
          next[postKey] = oldTags;
        }
        return next;
      });
      
      // 可选：显示错误提示
      alert('保存标签失败，请重试');
    } finally {
      // 6. 移除保存中标记
      setSavingTags(prev => {
        const next = new Set(prev);
        next.delete(postKey);
        return next;
      });
    }
  };

  // 获取帖子的 source
  const getPostSource = (post: LinuxDoPost | RedditPost | HeyboxPost): 'linuxdo' | 'reddit' | 'heybox' => {
    if (linuxdoData?.posts.some(p => p.id === post.id)) return 'linuxdo';
    if (redditData?.posts.some(p => p.id === post.id)) return 'reddit';
    if (heyboxData?.posts.some(p => p.id === post.id)) return 'heybox';
    return 'linuxdo'; // 默认值
  };

  // 大纲跳转
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  // 获取Reddit按板块分组
  const groupedReddit = React.useMemo(() => {
    if (!redditData) return {};
    const groups: Record<string, RedditPost[]> = {};
    redditData.posts.forEach(post => {
      const subreddit = post.subreddit || 'other';
      if (!groups[subreddit]) groups[subreddit] = [];
      groups[subreddit].push(post);
    });
    return groups;
  }, [redditData]);

  // 🔍 动态收集所有用户标签（全局标签池）
  const allUserTags = React.useMemo(() => {
    const tags = new Set<string>();
    Object.values(postTags).forEach(tagArray => {
      tagArray.forEach(tag => tags.add(tag));
    });
    // 按字母排序
    return Array.from(tags).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [postTags]);

  // 🔍 收集所有帖子类型
  const allPostTypes = React.useMemo(() => {
    const types = new Set<string>();
    [linuxdoData, redditData, heyboxData].forEach(data => {
      data?.posts.forEach(post => types.add(post.analysis.post_type));
    });
    return Array.from(types).sort();
  }, [linuxdoData, redditData, heyboxData]);

  // 🔍 所有价值评估选项
  const allValues = ['高', '中', '低'];

  // 获取显示的帖子
  const displayedPosts = React.useMemo(() => {
    const allPosts: Array<(LinuxDoPost | RedditPost | HeyboxPost) & { source: 'linuxdo' | 'reddit' | 'heybox' }> = [];
    
    if (activeSource === 'all' || activeSource === 'linuxdo') {
      linuxdoData?.posts.forEach(post => {
        allPosts.push({ ...post, source: 'linuxdo' as const });
      });
    }
    
    if (activeSource === 'all' || activeSource === 'reddit') {
      redditData?.posts.forEach(post => {
        allPosts.push({ ...post, source: 'reddit' as const });
      });
    }
    
    if (activeSource === 'all' || activeSource === 'heybox') {
      heyboxData?.posts.forEach(post => {
        allPosts.push({ ...post, source: 'heybox' as const });
      });
    }
    
    // 🔍 应用筛选
    let filtered = allPosts;
    
    // 用户标签筛选
    if (selectedUserTag) {
      filtered = filtered.filter(post => 
        postTags[`${getPostSource(post)}-${post.id}`]?.includes(selectedUserTag)
      );
    }
    
    // 帖子类型筛选
    if (selectedPostType) {
      filtered = filtered.filter(post => 
        post.analysis.post_type === selectedPostType
      );
    }
    
    // 价值评估筛选
    if (selectedValue) {
      filtered = filtered.filter(post => 
        post.analysis.value_assessment === selectedValue
      );
    }
    
    return filtered;
  }, [linuxdoData, redditData, heyboxData, activeSource, postTags, selectedUserTag, selectedPostType, selectedValue]);

  const getPostTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      '技术问答': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      '技术讨论': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      '资源分享': 'bg-green-500/10 text-green-400 border-green-500/30',
      '新闻资讯': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      '新闻分享': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      '教程指南': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      '项目展示': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      '优惠活动': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  const getValueIcon = (value: string) => {
    return value === '高' ? '⭐' : value === '中' ? '◆' : '○';
  };

  const getSourceBadge = (source: 'linuxdo' | 'reddit' | 'heybox') => {
    if (source === 'linuxdo') {
      return <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs border border-blue-500/30">🐧</span>;
    } else if (source === 'reddit') {
      return <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs border border-orange-500/30">🔴</span>;
    } else {
      return <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs border border-purple-500/30">🎮</span>;
    }
  };

  if (loading || loadingDates) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-white/60">{loadingDates ? '加载日期列表...' : '加载中...'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen flex home-page-layout">
      {/* 左侧：大纲导航 */}
      <aside className="hidden lg:block w-56 flex-shrink-0 border-r border-white/10 bg-gray-900/50 backdrop-blur-sm 
                      fixed left-0 top-0 bottom-0 overflow-y-auto custom-scrollbar z-20">
        <div className="p-4">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <span>📋</span>
            大纲导航
          </h2>

          {/* Linuxdo */}
          {(activeSource === 'all' || activeSource === 'linuxdo') && linuxdoData && (
            <div className="mb-6">
              <div 
                onClick={() => scrollToSection('linuxdo')}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeSection === 'linuxdo' ? 'bg-blue-500/20 text-blue-400' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="text-base">🐧</span>
                <span className="font-medium">Linux.do</span>
                <span className="ml-auto text-xs text-white/40">({linuxdoData.posts.length})</span>
              </div>
              <div className="ml-6 mt-2 space-y-1">
                {linuxdoData.posts.slice(0, 10).map((post, idx) => (
                  <div
                    key={post.id}
                    onClick={() => scrollToSection(`post-linuxdo-${post.id}`)}
                    className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate 
                             transition-colors py-1 hover:bg-white/5 rounded px-2"
                    title={post.title}
                  >
                    {idx + 1}. {post.title}
                  </div>
                ))}
                {linuxdoData.posts.length > 10 && (
                  <div className="text-xs text-white/30 px-2 py-1">
                    还有 {linuxdoData.posts.length - 10} 篇...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reddit板块 */}
          {(activeSource === 'all' || activeSource === 'reddit') && Object.entries(groupedReddit).map(([subreddit, posts]) => (
            <div key={subreddit} className="mb-6">
              <div
                onClick={() => scrollToSection(`reddit-${subreddit}`)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeSection === `reddit-${subreddit}` ? 'bg-orange-500/20 text-orange-400' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="text-base">🔴</span>
                <span className="font-medium">r/{subreddit}</span>
                <span className="ml-auto text-xs text-white/40">({posts.length})</span>
              </div>
              <div className="ml-6 mt-2 space-y-1">
                {posts.slice(0, 10).map((post, idx) => (
                  <div
                    key={post.id}
                    onClick={() => scrollToSection(`post-reddit-${post.id}`)}
                    className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate 
                             transition-colors py-1 hover:bg-white/5 rounded px-2"
                    title={post.title}
                  >
                    {idx + 1}. {post.title}
                  </div>
                ))}
                {posts.length > 10 && (
                  <div className="text-xs text-white/30 px-2 py-1">
                    还有 {posts.length - 10} 篇...
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 小黑盒 */}
          {(activeSource === 'all' || activeSource === 'heybox') && heyboxData && (
            <div className="mb-6">
              <div 
                onClick={() => scrollToSection('heybox')}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeSection === 'heybox' ? 'bg-purple-500/20 text-purple-400' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="text-base">🎮</span>
                <span className="font-medium">小黑盒</span>
                <span className="ml-auto text-xs text-white/40">({heyboxData.posts.length})</span>
              </div>
              <div className="ml-6 mt-2 space-y-1">
                {heyboxData.posts.slice(0, 10).map((post, idx) => (
                  <div
                    key={post.id}
                    onClick={() => scrollToSection(`post-heybox-${post.id}`)}
                    className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate 
                             transition-colors py-1 hover:bg-white/5 rounded px-2"
                    title={post.title}
                  >
                    {idx + 1}. {post.title}
                  </div>
                ))}
                {heyboxData.posts.length > 10 && (
                  <div className="text-xs text-white/30 px-2 py-1">
                    还有 {heyboxData.posts.length - 10} 篇...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 ml-0 lg:ml-56 overflow-hidden flex flex-col">
        {/* 顶部切换栏 */}
        <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur-md border-b border-white/10 z-10">
          <div className="px-6 py-3 space-y-3">
            {/* 第一行：源选择 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveSource('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSource === 'all'
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  📊 全部源
                </button>
                <button
                  onClick={() => setActiveSource('linuxdo')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSource === 'linuxdo'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🐧 Linux.do
                </button>
                <button
                  onClick={() => setActiveSource('reddit')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSource === 'reddit'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🔴 Reddit
                </button>
                <button
                  onClick={() => setActiveSource('heybox')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSource === 'heybox'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🎮 小黑盒
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm text-white/60">
                <span>共 {displayedPosts.length} 篇</span>
                
                {/* 📱 移动端标签栏切换按钮 */}
                <button
                  onClick={() => {
                    const newState = !showTagsBar;
                    setShowTagsBar(newState);
                    localStorage.setItem('showTagsBar', String(newState));
                  }}
                  className="md:hidden px-4 py-2 rounded-lg bg-emerald-500/20 
                           text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 
                           transition-all flex items-center gap-2"
                >
                  <span>🏷️</span>
                  <span>{showTagsBar ? '隐藏标签' : '显示标签'}</span>
                </button>
                
                <button
                  onClick={() => setShowAIChat(!showAIChat)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 
                           text-purple-400 border border-purple-500/30 hover:border-purple-500/50 
                           transition-all flex items-center gap-2"
                >
                  <span>💬</span>
                  <span>AI助手</span>
                </button>
              </div>
            </div>

            {/* 第二行：日期选择和过滤 */}
            <div className={`flex items-center gap-2 sm:gap-4 pt-2 border-t border-white/5 overflow-x-auto ${
              // md及以上始终显示，小于md时根据 showTagsBar 显示
              showTagsBar ? 'flex' : 'hidden'
            } md:flex`}>
              {/* LinuxDo日期选择 */}
              {(activeSource === 'all' || activeSource === 'linuxdo') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <span>🐧</span>
                    <span>日期:</span>
                  </span>
                  <select
                    value={selectedLinuxDoDate}
                    onChange={(e) => setSelectedLinuxDoDate(e.target.value)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                             hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-blue-500/50
                             transition-all cursor-pointer"
                  >
                    {availableLinuxDoDates.length > 0 ? (
                      availableLinuxDoDates.map(dateObj => (
                        <option key={dateObj.date} value={dateObj.date} className="bg-gray-900">
                          {formatDateLabel(dateObj.date)} ({dateObj.count}篇)
                        </option>
                      ))
                    ) : (
                      <option value={selectedLinuxDoDate} className="bg-gray-900">
                        {formatDateLabel(selectedLinuxDoDate)}
                      </option>
                    )}
                  </select>
                </div>
              )}

              {/* Reddit日期选择 */}
              {(activeSource === 'all' || activeSource === 'reddit') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <span>🔴</span>
                    <span>日期:</span>
                  </span>
                  <select
                    value={selectedRedditDate}
                    onChange={(e) => setSelectedRedditDate(e.target.value)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                             hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-orange-500/50
                             transition-all cursor-pointer"
                  >
                    {availableRedditDates.length > 0 ? (
                      availableRedditDates.map(dateObj => (
                        <option key={dateObj.date} value={dateObj.date} className="bg-gray-900">
                          {formatDateLabel(dateObj.date)} ({dateObj.count}篇)
                        </option>
                      ))
                    ) : (
                      <option value={selectedRedditDate} className="bg-gray-900">
                        {formatDateLabel(selectedRedditDate)}
                      </option>
                    )}
                  </select>
                </div>
              )}

              {/* 小黑盒日期选择 */}
              {(activeSource === 'all' || activeSource === 'heybox') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <span>🎮</span>
                    <span>日期:</span>
                  </span>
                  <select
                    value={selectedHeyboxDate}
                    onChange={(e) => setSelectedHeyboxDate(e.target.value)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                             hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-purple-500/50
                             transition-all cursor-pointer"
                  >
                    {availableHeyboxDates.length > 0 ? (
                      availableHeyboxDates.map(dateObj => (
                        <option key={dateObj.date} value={dateObj.date} className="bg-gray-900">
                          {formatDateLabel(dateObj.date)} ({dateObj.count}篇)
                        </option>
                      ))
                    ) : (
                      <option value={selectedHeyboxDate} className="bg-gray-900">
                        {formatDateLabel(selectedHeyboxDate)}
                      </option>
                    )}
                  </select>
                </div>
              )}

              {/* 🔍 筛选区域 */}
              <div className="flex items-center gap-3 ml-auto overflow-x-auto">
                {/* 用户标签云 */}
                {allUserTags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50 hidden sm:inline">🏷️ 标签:</span>
                    <div className="flex items-center gap-1 max-w-md overflow-x-auto custom-scrollbar">
                      {allUserTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedUserTag(selectedUserTag === tag ? '' : tag)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 
                                      rounded-md text-xs font-medium border transition-all 
                                      whitespace-nowrap shadow-sm ${
                            selectedUserTag === tag
                              ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 帖子类型筛选 - 中屏以上显示 */}
                {allPostTypes.length > 0 && (
                  <select
                    value={selectedPostType}
                    onChange={(e) => setSelectedPostType(e.target.value)}
                    className="hidden md:block px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white
                               hover:bg-white/10 focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="">全部类型</option>
                    {allPostTypes.map(type => (
                      <option key={type} value={type} className="bg-gray-900">{type}</option>
                    ))}
                  </select>
                )}
                
                {/* 价值评估筛选 - 中屏以上显示 */}
                <select
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  className="hidden md:block px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white
                             hover:bg-white/10 focus:outline-none focus:border-purple-500/50 transition-all"
                >
                  <option value="">全部价值</option>
                  {allValues.map(val => (
                    <option key={val} value={val} className="bg-gray-900">{val}</option>
                  ))}
                </select>
                
                {/* 清除筛选 */}
                {(selectedUserTag || selectedPostType || selectedValue) && (
                  <button
                    onClick={() => {
                      setSelectedUserTag('');
                      setSelectedPostType('');
                      setSelectedValue('');
                    }}
                    className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 
                               rounded text-xs hover:bg-red-500/20 transition-all whitespace-nowrap"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-3 sm:py-6">
          <div className="max-w-7xl mx-auto">
            {/* 网格布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {displayedPosts.map((post) => (
                <div
                  key={`${post.source}-${post.id}`}
                  id={`post-${post.source}-${post.id}`}
                  onClick={() => handleClick(post)}
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 
                           hover:border-white/20 transition-all duration-200 cursor-pointer group 
                           hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="flex flex-col h-full">
                    {/* 标签行 */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {/* ✨ 用户标签（最前） */}
                      {postTags[`${getPostSource(post)}-${post.id}`] && postTags[`${getPostSource(post)}-${post.id}`].length > 0 && (
                        <>
                          {postTags[`${getPostSource(post)}-${post.id}`].map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 
                                                       bg-emerald-500/25 text-emerald-300 
                                                       rounded-md text-xs font-medium 
                                                       border border-emerald-400/40 shadow-sm">
                              <span className="text-[10px]">🏷️</span>
                              {tag}
                            </span>
                          ))}
                        </>
                      )}
                      
                      {/* 社区标签 */}
                      {getSourceBadge(post.source)}
                      
                      {/* 帖子类型 */}
                      <span className={`px-2 py-0.5 rounded text-xs border ${getPostTypeColor(post.analysis.post_type)}`}>
                        {post.analysis.post_type}
                      </span>
                      
                      {/* 价值图标 */}
                      <span className="text-xs">
                        {getValueIcon(post.analysis.value_assessment)}
                      </span>
                    </div>

                    {/* 标题（优先显示中文优化标题） */}
                    <h3 className="text-base font-semibold text-white group-hover:text-blue-400 
                                 transition-colors mb-2 line-clamp-2 flex-shrink-0">
                      {'title_cn' in post && post.title_cn ? post.title_cn : post.title}
                    </h3>

                    {/* 核心问题 */}
                    <p className="text-sm text-white/60 line-clamp-3 flex-1">
                      {post.analysis.core_issue}
                    </p>

                    {/* 社区互动数据 */}
                    {('replies_count' in post || 'participants_count' in post) && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                        {'replies_count' in post && (post as { replies_count: number }).replies_count > 0 && (
                          <span className="flex items-center gap-1">💬 {(post as { replies_count: number }).replies_count} 条回复</span>
                        )}
                        {'participants_count' in post && (post as { participants_count: number }).participants_count > 0 && (
                          <span className="flex items-center gap-1">👥 {(post as { participants_count: number }).participants_count} 人参与</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 空状态 */}
            {displayedPosts.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-white/60 text-lg mb-2">该日期暂无数据</p>
                <p className="text-white/40 text-sm">请选择其他日期查看</p>
              </div>
            )}
                    </div>
                  </div>
                </div>

      {/* AI对话悬浮窗 */}
      {showAIChat && (
        <div className="fixed bottom-6 right-6 z-40 w-96 h-[600px] bg-gray-900 rounded-2xl 
                      border border-white/20 shadow-2xl overflow-hidden flex flex-col animate-fade-in">
          {/* 头部 */}
          <div className="flex-shrink-0 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 
                        border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <span className="text-white font-semibold">AI 对话助手</span>
                    </div>
            <button
              onClick={() => setShowAIChat(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full 
                       bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
                </div>

          {/* 内容区 */}
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 
                            rounded-full flex items-center justify-center border-2 border-purple-500/30">
                <span className="text-4xl">🤖</span>
              </div>
              <div>
                <p className="text-white/70 text-sm mb-2">AI对话功能</p>
                <p className="text-white/40 text-xs">即将推出</p>
                    </div>
              <div className="text-xs text-white/30 space-y-1">
                <p>✨ 智能问答</p>
                <p>📚 内容总结</p>
                <p>🔍 深度解析</p>
                <p>💡 个性推荐</p>
                    </div>
                  </div>
                </div>

          {/* 底部输入框占位 */}
          <div className="flex-shrink-0 p-4 border-t border-white/10">
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg border border-white/10">
              <input
                type="text"
                placeholder="即将开放..."
                disabled
                className="flex-1 bg-transparent text-white/40 text-sm outline-none"
              />
              <button
                disabled
                className="px-3 py-1 bg-purple-500/20 text-purple-400/50 rounded-lg text-sm"
              >
                发送
              </button>
            </div>
                      </div>
                      </div>
      )}

      {/* 详情面板 - 移动端集成标签Tab，桌面端独立 */}
      {hoveredPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4"
          onClick={() => {
            setHoveredPost(null);
            setMobileTab('content');
          }}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          
          {/* 内容面板 */}
          <div
            ref={detailPanelRef}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gray-900 rounded-none lg:rounded-2xl border border-white/20 shadow-2xl 
                     max-w-4xl w-full max-h-full lg:max-h-[85vh] overflow-hidden flex flex-col animate-fade-in"
          >
            {/* 头部 */}
            <div className="flex-shrink-0 p-4 lg:p-6 border-b border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs border ${
                      getPostTypeColor(hoveredPost.analysis.post_type)
                    }`}>
                      {hoveredPost.analysis.post_type}
                    </span>
                    <span className="text-sm">
                      {getValueIcon(hoveredPost.analysis.value_assessment)}
                    </span>
                  </div>
                  <h2 className="text-lg lg:text-xl font-bold text-white mb-2">
                    {'title_cn' in hoveredPost && hoveredPost.title_cn ? hoveredPost.title_cn : hoveredPost.title}
                  </h2>
                  <p className="text-sm text-white/70">
                    {hoveredPost.analysis.core_issue}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setHoveredPost(null);
                    setMobileTab('content');
                  }}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full 
                           bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 移动端 Tab 切换 */}
            <div className="lg:hidden flex-shrink-0 flex border-b border-white/10">
              <button
                onClick={() => setMobileTab('content')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  mobileTab === 'content'
                    ? 'bg-white/10 text-white border-b-2 border-emerald-500'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                📄 内容
              </button>
              <button
                onClick={() => setMobileTab('tags')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  mobileTab === 'tags'
                    ? 'bg-white/10 text-white border-b-2 border-emerald-500'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                🏷️ 标签
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* 移动端：根据 Tab 切换显示 */}
              <div className="lg:hidden">
                {mobileTab === 'content' ? (
                  <div className="p-4">
                    {hoveredPost.analysis.detailed_analysis ? (
                      <div className="markdown-content max-w-none">
                        <MarkdownRenderer
                          content={hoveredPost.analysis.detailed_analysis}
                          variant="dark"
                          rehypePlugins={[rehypeHighlight]}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>💡</span>
                          关键信息
                        </h3>
                        <ul className="space-y-2">
                          {hoveredPost.analysis.key_info.map((info, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-white/80 text-sm">
                              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center 
                                             bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span>{info}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4">
                    <PostTagSelector
                      currentTags={postTags[`${getPostSource(hoveredPost)}-${hoveredPost.id}`] || []}
                      availableTags={allUserTags}
                      onTagsChange={(newTags) => {
                        const source = getPostSource(hoveredPost);
                        const postKey = `${source}-${hoveredPost.id}`;
                        savePostTags(postKey, newTags, source, hoveredPost.id);
                      }}
                      isSaving={savingTags.has(`${getPostSource(hoveredPost)}-${hoveredPost.id}`)}
                    />
                  </div>
                )}
              </div>

              {/* 桌面端：只显示内容 */}
              <div className="hidden lg:block p-6">
                {hoveredPost.analysis.detailed_analysis ? (
                  <div className="markdown-content max-w-none">
                    <MarkdownRenderer
                      content={hoveredPost.analysis.detailed_analysis}
                      variant="dark"
                      rehypePlugins={[rehypeHighlight]}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>💡</span>
                      关键信息
                    </h3>
                    <ul className="space-y-2">
                      {hoveredPost.analysis.key_info.map((info, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-white/80">
                          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center 
                                         bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span>{info}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 底部 */}
            <div className="flex-shrink-0 p-4 border-t border-white/10 flex justify-end">
              <a
                href={hoveredPost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 lg:px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 
                         hover:from-blue-600 hover:to-purple-600
                         text-white font-medium rounded-lg transition-all duration-200 
                         flex items-center gap-2 text-sm"
              >
                查看原文
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ✨ 桌面端侧边栏标签编辑面板 */}
      {hoveredPost && (
        <div 
          className="hidden lg:flex fixed inset-y-0 right-0 w-80
                     bg-gray-900 border-l border-white/20
                     shadow-2xl z-[60] flex-col animate-slide-in"
        >
          {/* 头部 */}
          <div className="flex-shrink-0 p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏷️</span>
              <span className="text-white font-semibold">编辑标签</span>
            </div>
            <button
              onClick={() => setHoveredPost(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full 
                       bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 帖子信息 */}
          <div className="flex-shrink-0 p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              {getSourceBadge(getPostSource(hoveredPost))}
              <span className={`px-2 py-0.5 rounded text-xs border ${
                getPostTypeColor(hoveredPost.analysis.post_type)
              }`}>
                {hoveredPost.analysis.post_type}
              </span>
            </div>
            <h3 className="text-sm font-medium text-white line-clamp-2">
              {'title_cn' in hoveredPost && hoveredPost.title_cn ? hoveredPost.title_cn : hoveredPost.title}
            </h3>
          </div>

          {/* 标签编辑器 */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <PostTagSelector
              currentTags={postTags[`${getPostSource(hoveredPost)}-${hoveredPost.id}`] || []}
              availableTags={allUserTags}
              onTagsChange={(newTags) => {
                const source = getPostSource(hoveredPost);
                const postKey = `${source}-${hoveredPost.id}`;
                savePostTags(postKey, newTags, source, hoveredPost.id);
              }}
              isSaving={savingTags.has(`${getPostSource(hoveredPost)}-${hoveredPost.id}`)}
            />
          </div>

          {/* 底部提示 */}
          <div className="flex-shrink-0 p-4 border-t border-white/10">
            <p className="text-xs text-white/40 text-center">
              标签将自动保存
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default ScrollableLayout;
