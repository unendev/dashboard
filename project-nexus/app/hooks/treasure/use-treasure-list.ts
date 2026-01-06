import { useState, useEffect, useCallback, useRef } from 'react';

export interface Treasure {
  id: string;
  title: string;
  content?: string;
  type: 'TEXT' | 'IMAGE';
  tags: string[];
  theme?: string[] | null;
  createdAt: string;
  updatedAt: string;
  images: Array<{
    id: string;
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  }>;
}

export function useTreasureList(pageSize: number = 20) {
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  const lastLoadScrollTop = useRef<number>(0);
  const treasureRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const pageRef = useRef<number>(1);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery !== debouncedSearchQuery) setIsSearching(false);
    }, 300);
    if (searchQuery !== debouncedSearchQuery) setIsSearching(true);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // 获取统计数据
  const fetchStatsData = useCallback(async () => {
    try {
      const response = await fetch('/api/treasures?statsOnly=true');
      if (response.ok) {
        const data = await response.json();
        setStatsData(data.treasures || []);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, []);

  // 获取宝藏列表
  const fetchTreasures = useCallback(async (isInitial = true) => {
    if (!isInitial && (isLoadingMore || !hasMore)) return;
    
    try {
      if (isInitial) setIsSearching(true);
      else setIsLoadingMore(true);

      const scrollBeforeLoad = window.scrollY;
      const params = new URLSearchParams();
      const currentPage = isInitial ? 1 : pageRef.current + 1;

      if (debouncedSearchQuery) {
        if (debouncedSearchQuery.startsWith('#')) {
          const tagQuery = debouncedSearchQuery.slice(1).trim();
          if (tagQuery) params.append('tag', tagQuery);
        } else {
          params.append('search', debouncedSearchQuery);
        }
      }
      
      if (selectedTag) params.append('tag', selectedTag);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      
      const response = await fetch(`/api/treasures?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        if (isInitial) {
          setTreasures(data);
          pageRef.current = 1;
          setHasMore(data.length === pageSize);
          lastLoadScrollTop.current = 0;
        } else {
          setTreasures(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const uniqueNewData = data.filter((t: Treasure) => !existingIds.has(t.id));
            return [...prev, ...uniqueNewData];
          });
          pageRef.current = currentPage;
          setHasMore(data.length === pageSize);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      if (isInitial) setIsSearching(false);
      else setIsLoadingMore(false);
    }
  }, [debouncedSearchQuery, selectedTag, pageSize, isLoadingMore, hasMore]);

  // 初始化加载
  useEffect(() => {
    fetchTreasures(true);
  }, [debouncedSearchQuery, selectedTag, fetchTreasures]);

  // 无限滚动 Hook
  useEffect(() => {
    let throttleTimer: NodeJS.Timeout | null = null;
    let lastScrollTop = 0;
    
    const handleScroll = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        const isScrollingDown = scrollTop > lastScrollTop;
        lastScrollTop = scrollTop;
        
        if (distanceToBottom < 500 && !isLoadingMore && hasMore && isScrollingDown && 
           (scrollTop - lastLoadScrollTop.current >= 300 || lastLoadScrollTop.current === 0)) {
          lastLoadScrollTop.current = scrollTop;
          fetchTreasures(false);
        }
      }, 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [fetchTreasures, isLoadingMore, hasMore]);

  // 视口追踪 Effect
  useEffect(() => {
    if (treasures.length === 0) return;
    
    const isDesktop = window.matchMedia('(min-width: 1280px)').matches;
    if (!isDesktop) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let closestEntry: IntersectionObserverEntry | undefined;
        let minDistance = Infinity;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const rect = entry.boundingClientRect;
            const viewportCenter = window.innerHeight / 2;
            const elementCenter = rect.top + rect.height / 2;
            const distance = Math.abs(elementCenter - viewportCenter);
            
            if (distance < minDistance) {
              minDistance = distance;
              closestEntry = entry;
            }
          }
        });

        if (closestEntry && closestEntry.target instanceof HTMLElement) {
          const id = closestEntry.target.getAttribute('data-treasure-id');
          if (id && id !== activeId) {
            setActiveId(id);
          }
        }
      },
      { root: null, rootMargin: '-30% 0px -30% 0px', threshold: [0.5] }
    );

    const timeoutId = setTimeout(() => {
      treasureRefsMap.current.forEach((element) => {
        if (element) observer.observe(element);
      });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [treasures, activeId]);

  const scrollToTreasure = (id: string) => {
    const element = treasureRefsMap.current.get(id);
    if (element) {
      setActiveId(id);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return {
    treasures, setTreasures,
    searchQuery, setSearchQuery,
    isSearching,
    selectedTag, setSelectedTag,
    isLoadingMore,
    hasMore,
    statsData, setStatsData,
    activeId, setActiveId,
    treasureRefsMap,
    fetchTreasures,
    fetchStatsData,
    scrollToTreasure
  };
}
