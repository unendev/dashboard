'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Epub, { Book, Rendition } from 'epubjs';
import { useReaderStore } from './useReaderStore';
import * as webdavCache from '@/lib/webdav-cache';

interface EpubReaderProps {
  bookId: string;
  title?: string;
  initialLocation?: string;
  onLocationChange?: (cfi: string, progress: number) => void;
  onRenditionReady?: (rendition: Rendition) => void;
}

export default function EpubReader({ bookId, title, initialLocation, onLocationChange, onRenditionReady }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 翻页状态标志 - 用于禁用 relocated 事件处理
  const isPageTurningRef = useRef(false);
  
  const { setBook, fontSize, theme, setSelection, bubbles } = useReaderStore();

  // 翻页函数
  const goNext = useCallback(async () => {
    if (renditionRef.current) {
      if (isPageTurningRef.current) return;
      isPageTurningRef.current = true;
      console.log('[PAGE-TURN] goNext 调用');
      try {
        await renditionRef.current.next();
        console.log('[PAGE-TURN] goNext 完成');
      } catch (e) {
        console.error('[PAGE-TURN] goNext 失败:', e);
        isPageTurningRef.current = false;
      }
    }
  }, []);

  const goPrev = useCallback(async () => {
    if (renditionRef.current) {
      if (isPageTurningRef.current) return;
      isPageTurningRef.current = true;
      console.log('[PAGE-TURN] goPrev 调用');
      try {
        await renditionRef.current.prev();
        console.log('[PAGE-TURN] goPrev 完成');
      } catch (e) {
        console.error('[PAGE-TURN] goPrev 失败:', e);
        isPageTurningRef.current = false;
      }
    }
  }, []);

  // 键盘翻页
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // 移动端滑动翻页
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !isReady) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      console.log('[SWIPE-DEBUG] touchstart:', { x: touchStartX, y: touchStartY });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      console.log('[SWIPE-DEBUG] touchend:', { deltaX, deltaY, minSwipeDistance });
      
      // 确保是水平滑动（水平距离大于垂直距离）
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          console.log('[SWIPE-DEBUG] 右滑 - 上一页');
          goPrev(); // 右滑 = 上一页
        } else {
          console.log('[SWIPE-DEBUG] 左滑 - 下一页');
          goNext(); // 左滑 = 下一页
        }
      }
    };

    viewer.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewer.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      viewer.removeEventListener('touchstart', handleTouchStart);
      viewer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isReady, goNext, goPrev]);

  const applyStyles = useCallback((rendition: Rendition) => {
    try {
      // 根据主题应用不同的背景和文字颜色
      let bgStyle = '';
      let text = '';
      let linkColor = '';
      
      if (theme === 'dark') {
        bgStyle = '#1a1a1a';
        text = '#ffffff';
        linkColor = '#8ab4f8';
      } else if (theme === 'sepia') {
        // Dark Reader 反转后的护眼色：深棕色背景 + 白色文字
        bgStyle = '#2b2416';
        text = '#ffffff';
        linkColor = '#c9a87a';
      } else {
        bgStyle = '#faf8f3';
        text = '#1a1a1a';
        linkColor = '#8b6f47';
      }
      
      rendition.themes.register('default', {
        body: { 
          'font-family': "'Georgia', 'Times New Roman', 'Noto Serif CJK SC', serif", 
          'font-size': `${fontSize}px`,
          'line-height': '1.8',
          'color': text,
          'background': bgStyle,
          'padding': '0 20px',
          'writing-mode': 'horizontal-tb',
          '-webkit-writing-mode': 'horizontal-tb',
        },
        'a': {
          'color': linkColor,
          'text-decoration': 'none',
          'border-bottom': `1px solid ${linkColor}`,
        },
        'a:visited': {
          'color': linkColor,
        },
        'p': {
          'margin-bottom': '1.5em',
          'text-align': 'justify'
        },
        'ruby': {
          'font-size': '0.6em'
        }
      });
      rendition.themes.select('default');
      
    } catch (e) {
      console.error('[EpubReader] Failed to apply styles:', e);
    }
  }, [fontSize, theme]);
  
  // 当主题或字体大小改变时，重新应用样式并重新渲染当前页面
  useEffect(() => {
    if (renditionRef.current && isReady) {
      applyStyles(renditionRef.current);
      
      try {
        const currentLocation = renditionRef.current.currentLocation() as any;
        if (currentLocation?.start?.cfi) {
          renditionRef.current.display(currentLocation.start.cfi);
        }
      } catch (e) {
        // 静默处理
      }
    }
  }, [fontSize, theme, isReady, applyStyles]);

  // 使用 ref 来存储回调，避免依赖变化导致重新加载
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;
  
  const bubblesRef = useRef(bubbles);
  bubblesRef.current = bubbles;

  // 翻页函数的 ref
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goPrevRef = useRef(goPrev);
  goPrevRef.current = goPrev;

  useEffect(() => {
    let mounted = true;
    let currentBook: Book | null = null;
    let renderBubblesHandler: (() => void) | null = null;
    let readyTimeout: NodeJS.Timeout | null = null;
    let saveProgressTimeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      
      mounted = false;
      if (readyTimeout) {
        clearTimeout(readyTimeout);
        readyTimeout = null;
      }
      if (saveProgressTimeout) {
        clearTimeout(saveProgressTimeout);
        saveProgressTimeout = null;
      }
      if (currentBook) {
        if (renderBubblesHandler) {
          currentBook.off('rendition:rendered', renderBubblesHandler);
        }
        try {
          currentBook.destroy();
        } catch {
          // 静默处理
        }
        currentBook = null;
      }
      bookRef.current = null;
      renditionRef.current = null;
    };

    const loadBook = async () => {
      try {
        if (!viewerRef.current) {
          throw new Error('Viewer container not found');
        }

        setError(null);

        const cachedBlob = await webdavCache.getBook(bookId);
        
        if (!cachedBlob) {
          throw new Error('书籍未找到，请确认已上传到 WebDAV');
        }
        
        if (!mounted) return;
        
        const bookData = await cachedBlob.arrayBuffer();

        if (!mounted || !viewerRef.current) return;

        const book = Epub(bookData);
        currentBook = book;
        bookRef.current = book;
        setBook(book);

        if (!mounted || !viewerRef.current) {
          cleanup();
          return;
        }

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
          allowScriptedContent: true,
        });
        renditionRef.current = rendition;

        // 启用移动端文本选择
        rendition.hooks.content.register((contents: any) => {
          const doc = contents.document;
          const win = contents.window;
          
          // 确保文本可选择 + 高亮样式
          const style = doc.createElement('style');
          style.textContent = `
            * {
              -webkit-user-select: text !important;
              -moz-user-select: text !important;
              -ms-user-select: text !important;
              user-select: text !important;
              -webkit-touch-callout: default !important;
            }
            body {
              -webkit-tap-highlight-color: rgba(0,0,0,0);
            }
          `;
          doc.head.appendChild(style);
          
          // 移动端：监听 selectionchange 事件
          let selectionTimeout: NodeJS.Timeout | null = null;
          let lastSelectionText = '';
          doc.addEventListener('selectionchange', () => {
            // 如果正在翻页，忽略 selectionchange
            if ((rendition as any)._isSwipingRef) {
              return;
            }
            
            if (selectionTimeout) clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(() => {
              const selection = win.getSelection();
              if (selection && !selection.isCollapsed) {
                const text = selection.toString().trim();
                // 避免重复触发
                if (text.length > 0 && text !== lastSelectionText) {
                  lastSelectionText = text;
                  try {
                    const range = selection.getRangeAt(0);
                    const cfiRange = contents.cfiFromRange(range);
                    if (cfiRange) {
                      rendition.emit('selected', cfiRange, contents);
                    }
                  } catch (e) {
                    // 静默处理
                  }
                }
              } else {
                lastSelectionText = '';
              }
            }, 500); // 增加延迟，避免频繁触发
          });
        });

        readyTimeout = setTimeout(() => {
          if (mounted) {
            setIsReady(true);
          }
        }, 8000);

        try {
          await Promise.race([
            rendition.display(initialLocation || undefined),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Display timeout')), 5000)
            )
          ]);
        } catch (e) {
          // 如果初始位置加载失败，尝试从头开始
          try {
            await rendition.display();
          } catch {
            // 继续执行
          }
        }
        
        if (readyTimeout) {
          clearTimeout(readyTimeout);
          readyTimeout = null;
        }
        
        if (!mounted) {
          cleanup();
          return;
        }

        applyStyles(rendition);

        // 加载导航（目录）
        try {
          await book.loaded.navigation;
        } catch (e) {
          // 静默处理
        }

        // 拦截 display 调用来追踪位置变化
        const originalDisplay = rendition.display.bind(rendition);
        rendition.display = function(target: any) {
          console.log('[SWIPE-DEBUG] rendition.display() 被调用:', { 
            target: typeof target === 'string' ? target.substring(0, 50) : target,
            isPageTurning: isPageTurningRef.current,
            stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
          });
          return originalDisplay(target);
        };
        
        // 初始化计数器
        (window as any).__relocatedCount = 0;

        // 先标记为 ready，让用户可以开始阅读
        if (mounted) {
          setIsReady(true);
          if (onRenditionReady) {
            onRenditionReady(rendition);
          }
        }

        // 尝试从缓存加载 locations，否则后台生成
        const cachedLocations = await webdavCache.getLocations(bookId);
        if (cachedLocations) {
          try {
            book.locations.load(cachedLocations);
            console.log('[EpubReader] Locations loaded from cache:', book.locations.length());
          } catch (e) {
            console.warn('[EpubReader] Failed to load cached locations, regenerating:', e);
            book.locations.generate(1600).then(() => {
              console.log('[EpubReader] Locations regenerated:', book.locations.length());
              webdavCache.saveLocations(bookId, book.locations.save());
            }).catch(() => {});
          }
        } else {
          // 后台生成 locations（不阻塞 UI）
          book.locations.generate(1600).then(() => {
            console.log('[EpubReader] Locations generated:', book.locations.length());
            // 保存到缓存
            webdavCache.saveLocations(bookId, book.locations.save());
          }).catch((e) => {
            console.warn('[EpubReader] Failed to generate locations:', e);
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (location: any) => {
          if (!mounted) return;
          
          const isPageTurning = isPageTurningRef.current;
          const relocatedCfi = location?.start?.cfi;
          
          console.log('[RELOCATED] #' + (window as any).__relocatedCount++, { 
            isPageTurning,
            cfi: relocatedCfi?.substring(0, 30)
          });
          
          // 如果正在翻页，这是翻页后的第一个 relocated 事件，重置标志
          if (isPageTurning) {
            isPageTurningRef.current = false;
            console.log('[PAGE-TURN] relocated 触发，重置翻页标志');
          }
          
          try {
            const cfi = location?.start?.cfi;
            if (!cfi || typeof cfi !== 'string') return;
            
            console.log('[RELOCATED] #' + (window as any).__relocatedCount + ' 处理');
            
            // 使用 locations 计算准确的进度
            let progressValue = 0;
            try {
              if (book.locations && book.locations.length() > 0) {
                progressValue = book.locations.percentageFromCfi(cfi);
              } else {
                progressValue = location?.start?.percentage ?? 0;
              }
            } catch {
              progressValue = location?.start?.percentage ?? 0;
            }
            
            if (progressValue > 1) progressValue = progressValue / 100;
            progressValue = Math.max(0, Math.min(1, progressValue));
            
            // 调用 onLocationChange 回调
            onLocationChangeRef.current?.(cfi, progressValue);
            
            if (saveProgressTimeout) clearTimeout(saveProgressTimeout);
            
            saveProgressTimeout = setTimeout(async () => {
              try {
                console.log('[SWIPE-DEBUG] 保存进度:', { cfi: cfi.substring(0, 50), progress: progressValue });
                await webdavCache.saveProgress({
                  bookId,
                  currentCfi: cfi,
                  progress: progressValue,
                  currentChapter: 'Unknown',
                  lastReadAt: Date.now(),
                });
                console.log('[SWIPE-DEBUG] 进度保存完成');
              } catch (e) {
                console.error('[SWIPE-DEBUG] 进度保存失败:', e);
              }
            }, 500);
          } catch (e) {
            // 静默处理
          }
        });
        
        rendition.on('click', (e: MouseEvent) => {
          setSelection(null);
          
          // 基于视口宽度的自适应点击判断
          // e.view 是事件源的 window 对象（可能是 iframe 的 window）
          const eventWindow = e.view;
          
          if (eventWindow) {
            const width = eventWindow.innerWidth;
            const x = e.clientX;
            const ratio = x / width;
            
            console.log('[CLICK] 点击位置:', { 
              clientX: x, 
              width, 
              ratio: ratio.toFixed(2),
              isIframe: eventWindow !== window
            });
            
            // 左侧 30% 区域 - 上一页
            if (ratio < 0.3) {
              console.log('[CLICK] 左侧点击 - 调用 goPrev()');
              goPrevRef.current();
            }
            // 其余 70% 区域 - 下一页
            else {
              console.log('[CLICK] 右侧/中间点击 - 调用 goNext()');
              goNextRef.current();
            }
          } else {
             // 降级处理：如果获取不到 view，使用之前的 viewerRect 逻辑
             const viewerRect = viewerRef.current?.getBoundingClientRect();
             if (viewerRect) {
               // ... 原有逻辑作为备份 ...
                const clickX = e.clientX - viewerRect.left;
                const width = viewerRect.width;
                if (clickX < width * 0.3) goPrevRef.current();
                else if (clickX > width * 0.7) goNextRef.current();
             }
          }
        });

        // 处理链接点击 - 支持 Ctrl+点击（桌面）和长按/直接点击（移动端）
        rendition.on('linkClicked', (href: string, event: MouseEvent) => {
          // 检查是否是外部链接
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            // 桌面端：Ctrl+点击 或 移动端：直接点击
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (event.ctrlKey || event.metaKey || isMobile) {
              event.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }
        });

        renderBubblesHandler = () => {
          if (!renditionRef.current) return;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (renditionRef.current as any).highlights?.clear?.();
      
            bubblesRef.current.forEach(bubble => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (renditionRef.current as any)?.highlight?.(bubble.cfi, {}, () => {
                const event = new CustomEvent('ept-bubble-click', { detail: bubble.id });
                window.dispatchEvent(event);
              });
            });
          } catch {
            // 静默处理
          }
        };
        
        renderBubblesHandler();
        book.on('rendition:rendered', renderBubblesHandler);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (mounted) {
          setError(errorMsg);
        }
        cleanup();
      }
    };

    loadBook();

    return cleanup;
    // 只在 bookId 变化时重新加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);
  
    // CSS to highlight the bubbles (add to globals.css or component css)
    // .epub-bubble-highlight { background-color: rgba(255, 255, 0, 0.3); border-bottom: 1px dashed yellow; cursor: pointer; }
  
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-red-900 mb-2">加载失败</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative group bg-[#2b2416]">
      <div 
        ref={viewerRef} 
        className={`w-full h-full overflow-hidden ${!isReady ? 'opacity-0' : 'opacity-100'} transition-opacity duration-700`}
      />
      
      {/* PC端翻页提示 - 不阻止文本选择 */}
      {isReady && (
        <>
          {/* 左侧翻页热区 - 使用透明背景，不阻止事件 */}
          <div 
            className="absolute left-0 top-0 w-8 h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          >
            <div className="w-6 h-12 bg-white/10 rounded-r-full flex items-center justify-center">
              <span className="text-white/50 text-xs">‹</span>
            </div>
          </div>
          {/* 右侧翻页热区 */}
          <div 
            className="absolute right-0 top-0 w-8 h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          >
            <div className="w-6 h-12 bg-white/10 rounded-l-full flex items-center justify-center">
              <span className="text-white/50 text-xs">›</span>
            </div>
          </div>
        </>
      )}
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2b2416]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2" />
            <p className="text-sm text-amber-200">正在加载书籍...</p>
          </div>
        </div>
      )}
    </div>
  );
}
