'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useReaderStore } from '@/app/components/features/webread/useReaderStore';
import EpubReader from '@/app/components/features/webread/EpubReader';
import * as webdavCache from '@/lib/webdav-cache';
import { Loader2, ArrowLeft, BookOpen, Minus, Plus, Sun, Moon, Coffee, Settings, X } from 'lucide-react';
import Link from 'next/link';

interface BookMetadata {
  id: string;
  title: string;
}

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [bookMetadata, setBookMetadata] = useState<BookMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savedLocation, setSavedLocation] = useState<string | undefined>(undefined);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [toc, setToc] = useState<any[]>([]);
  const [rendition, setRendition] = useState<any>(null);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  
  const { currentCfi, progress, fontSize, setFontSize, theme, setTheme, book } = useReaderStore();

  useEffect(() => {
    // 获取书籍元数据
    webdavCache.getMetadataFromLocal(id).then(metadata => {
      if (metadata) {
        setBookMetadata({ id: metadata.id, title: metadata.title });
      } else {
        setBookMetadata({ id: id, title: id });
      }
      setLoading(false);
    }).catch(err => {
      console.error('[ReaderPage] Error fetching metadata:', err);
      setBookMetadata({ id: id, title: id });
      setLoading(false);
    });

    // 从云端同步进度（如果云端更新则使用云端版本）
    webdavCache.syncProgressFromCloud(id).then(savedProgress => {
      // 只在 CFI 有效时恢复位置
      if (savedProgress?.currentCfi && typeof savedProgress.currentCfi === 'string' && savedProgress.currentCfi.startsWith('epubcfi')) {
        console.log('[ReaderPage] Restoring progress:', savedProgress.currentCfi);
        setSavedLocation(savedProgress.currentCfi);
      }
      setProgressLoaded(true);
    }).catch(err => {
      console.warn('[ReaderPage] Failed to sync progress:', err);
      setProgressLoaded(true);
    });
  }, [id]);

  // 进度保存由 EpubReader 处理，这里只用于监控
  useEffect(() => {
    if (currentCfi && progress !== undefined) {
      // 进度已更新
    }
  }, [currentCfi, progress, id]);

  // 根据当前 CFI 更新当前章节
  useEffect(() => {
    if (currentCfi && toc.length > 0 && book) {
      try {
        // 找到当前 CFI 对应的章节
        const spineItem = book.spine.get(currentCfi);
        if (spineItem) {
          const currentHref = spineItem.href;
          // 在 TOC 中找到匹配的章节
          const matchedChapter = toc.find(item => {
            // 比较 href（可能需要处理锚点）
            const tocHref = item.href.split('#')[0];
            const currentHrefClean = currentHref.split('#')[0];
            return tocHref === currentHrefClean || item.href === currentHref;
          });
          if (matchedChapter) {
            setCurrentChapter(matchedChapter.href);
          }
        }
      } catch (e) {
        // 静默处理
      }
    }
  }, [currentCfi, toc, book]);

  // 当书籍加载完成时，提取目录
  useEffect(() => {
    if (book) {
      const extractToc = async () => {
        try {
          // 等待 navigation 加载完成
          if (book.loaded?.navigation) {
            await book.loaded.navigation;
          }
          
          const chapters: any[] = [];
          if (book.navigation && book.navigation.toc) {
            console.log('[ReaderPage] TOC found:', book.navigation.toc.length, 'items');
            const processToc = (items: any[], depth = 0) => {
              items.forEach(item => {
                if (depth < 3) { // 限制深度为3层
                  chapters.push({
                    label: item.label,
                    href: item.href,
                    depth,
                  });
                  if (item.subitems && item.subitems.length > 0) {
                    processToc(item.subitems, depth + 1);
                  }
                }
              });
            };
            processToc(book.navigation.toc);
          } else {
            console.log('[ReaderPage] No TOC found in book.navigation');
          }
          setToc(chapters);
        } catch (e) {
          console.error('[ReaderPage] Failed to extract TOC:', e);
        }
      };
      extractToc();
    }
  }, [book]);

  if (loading || !bookMetadata || !progressLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#2b2416]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 relative">
      {/* 富有想象力的背景 - 书籍主题的星空效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 星空背景 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,119,182,0.0))]" />
        
        {/* 浮动的书籍图案 */}
        <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 1200 800" preserveAspectRatio="none">
          <defs>
            <pattern id="books" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <rect x="20" y="20" width="60" height="100" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
              <line x1="25" y1="30" x2="75" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="40" x2="75" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="50" x2="75" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="60" x2="75" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="70" x2="75" y2="70" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="80" x2="75" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="90" x2="75" y2="90" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="100" x2="75" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="25" y1="110" x2="75" y2="110" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#books)" stroke="currentColor" />
        </svg>
        
        {/* 动画光线 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        
        {/* 细微的网格纹理 */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* 主阅读区 */}
      <main className="flex-1 relative flex overflow-hidden z-10">
        {/* 阅读器核心 */}
        <div className="flex-1 h-full w-full relative group">
          <EpubReader 
            bookId={id} 
            title={bookMetadata?.title}
            initialLocation={savedLocation}
            onLocationChange={(cfi, p) => {
              console.log('[ReaderPage] onLocationChange 被调用:', { cfi: cfi.substring(0, 50), progress: p });
              useReaderStore.getState().setCurrentLocation(cfi, p);
              console.log('[ReaderPage] setCurrentLocation 调用完成');
            }}
            onRenditionReady={(rend) => {
              setRendition(rend);
            }}
          />
          
          {/* 中心点击区域 - 打开控件（仅中心圆形区域） */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
            onClick={() => setShowControls(!showControls)}
          />
        </div>


      </main>

      {/* 控件面板 - 上下填满布局 */}
      {showControls && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowControls(false); setShowSettings(false); }}>
          {/* 上部区域：进度与目录 - 填满顶部 */}
          <div 
            className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-b border-white/10 p-4 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-lg mx-auto space-y-3">
              {/* 返回按钮 + 进度 */}
              <div className="flex items-center gap-4">
                <Link 
                  href="/webread"
                  className="p-2 bg-slate-800 rounded-full border border-white/10 hover:bg-slate-700 transition-colors flex items-center justify-center"
                  title="返回书架"
                >
                  <ArrowLeft className="w-5 h-5 text-amber-300" />
                </Link>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-amber-300 font-medium">阅读进度</span>
                    <span className="text-sm font-bold text-amber-100">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-300"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 目录选择 */}
              {toc.length > 0 && (
                <select 
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded text-amber-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  value={currentChapter}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    if (e.target.value && rendition) {
                      try {
                        rendition.display(e.target.value);
                        setCurrentChapter(e.target.value);
                        setShowControls(false);
                      } catch (err) {
                        console.error('[ReaderPage] Failed to navigate to chapter:', err);
                      }
                    }
                  }}
                >
                  {toc.map((item, idx) => (
                    <option key={idx} value={item.href}>
                      {'　'.repeat(item.depth)}{item.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 中右：更多设置按钮 */}
          <button 
            onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
            className="fixed top-1/2 right-4 -translate-y-1/2 p-3 bg-slate-800/95 backdrop-blur rounded-full border border-white/10 hover:bg-slate-700 transition-colors z-50 flex items-center justify-center"
            title="更多设置"
          >
            <Settings className="w-6 h-6 text-amber-300" />
          </button>

          {/* 更多设置面板（字体、主题） */}
          {showSettings && (
            <div 
              className="fixed top-1/2 right-16 -translate-y-1/2 bg-slate-800/95 backdrop-blur rounded-lg shadow-lg border border-white/10 p-4 w-64 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                {/* 字体大小 */}
                <div>
                  <label className="text-xs text-amber-300 mb-2 block font-medium">字体大小</label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                      className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Minus className="w-4 h-4 text-amber-300" />
                    </button>
                    <input 
                      type="range" 
                      min="12" 
                      max="28" 
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-sm font-medium w-8 text-center text-amber-100">{fontSize}</span>
                    <button 
                      onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                      className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4 text-amber-300" />
                    </button>
                  </div>
                </div>
                
                {/* 主题切换 */}
                <div>
                  <label className="text-xs text-amber-300 mb-2 block font-medium">阅读主题</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`p-2 rounded flex flex-col items-center justify-center gap-1 text-xs transition-all ${theme === 'light' ? 'bg-amber-600 text-white' : 'hover:bg-slate-700 text-amber-300 border border-white/10'}`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>亮色</span>
                    </button>
                    <button 
                      onClick={() => setTheme('sepia')}
                      className={`p-2 rounded flex flex-col items-center justify-center gap-1 text-xs transition-all ${theme === 'sepia' ? 'bg-amber-700 text-white' : 'hover:bg-slate-700 text-amber-300 border border-white/10'}`}
                    >
                      <Coffee className="w-4 h-4" />
                      <span>护眼</span>
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`p-2 rounded flex flex-col items-center justify-center gap-1 text-xs transition-all ${theme === 'dark' ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-amber-300 border border-white/10'}`}
                    >
                      <Moon className="w-4 h-4" />
                      <span>暗色</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 底部进度条 */}
      <div className="h-1 bg-white/10 relative z-10">
        <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
