'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Upload, Book as BookIcon, Trash2, Loader2, RefreshCw, ChevronDown, ChevronRight, Clock, BookOpen, Archive } from 'lucide-react';
import * as webdavCache from '@/lib/webdav-cache';
import WebDAVConfigPanel from '@/app/components/features/webread/WebDAVConfigPanel';
import { cn } from '@/lib/utils';

interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  fileSize: number;
  uploadDate: number;
  lastReadAt?: number;
  progress?: number;
  manualStatus?: BookStatus;
}

type BookStatus = 'recent' | 'want' | 'backlog';

// 7天内算最近读
const RECENT_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

function getBookStatus(book: Book): BookStatus {
  // 优先使用手动状态
  if (book.manualStatus) return book.manualStatus;
  
  const now = Date.now();
  const progress = book.progress || 0;
  const lastReadAt = book.lastReadAt || 0;
  
  // 从未打开过 = 想读
  if (progress === 0 && lastReadAt === 0) return 'want';
  
  // 7天内有阅读 = 最近读
  if (lastReadAt > 0 && (now - lastReadAt) < RECENT_THRESHOLD) return 'recent';
  
  // 有进度但超过7天没读 = 待读（搁置）
  return 'backlog';
}

// 封面组件
function BookCover({ book, gradient }: { book: Book; gradient: string }) {
  const [imgError, setImgError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadCoverImage();
  }, [book.id, book.coverUrl]);

  const loadCoverImage = async () => {
    try {
      setLoading(true);
      setImgError(false);
      
      const localBlob = await webdavCache.getCoverFromLocal(book.id);
      if (localBlob) {
        const dataUrl = URL.createObjectURL(localBlob);
        setImageSrc(dataUrl);
        setLoading(false);
        return;
      }
      
      if (!book.coverUrl) {
        setImgError(true);
        setLoading(false);
        return;
      }
      
      const configResponse = await fetch('/api/webread/webdav-config');
      if (!configResponse.ok) {
        setImgError(true);
        setLoading(false);
        return;
      }
      
      const config = await configResponse.json();
      const auth = btoa(`${config.username}:${config.password}`);
      
      const extensions = ['.jpg', '.jpeg', '.png'];
      let loaded = false;
      
      for (const ext of extensions) {
        if (loaded) break;
        const baseUrl = book.coverUrl.replace(/\.(jpg|jpeg|png)$/i, '');
        const coverUrl = baseUrl + ext;
        
        try {
          const response = await fetch(coverUrl, {
            headers: { 'Authorization': `Basic ${auth}` },
            mode: 'cors',
            credentials: 'omit',
          });
          
          if (response.ok) {
            const blob = await response.blob();
            await webdavCache.saveCoverToLocal(book.id, blob).catch(() => {});
            const dataUrl = URL.createObjectURL(blob);
            setImageSrc(dataUrl);
            loaded = true;
            setLoading(false);
            break;
          }
        } catch {
          // continue
        }
      }
      
      if (!loaded) {
        setImgError(true);
        setLoading(false);
      }
    } catch {
      setImgError(true);
      setLoading(false);
    }
  };

  if (imageSrc && !imgError) {
    return (
      <img 
        src={imageSrc} 
        alt={book.title} 
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4 relative`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <BookIcon className="w-10 h-10 text-white/20 mb-3" />
      <p className="text-white/60 text-xs text-center font-serif line-clamp-3 leading-relaxed">
        {book.title}
      </p>
    </div>
  );
}

// 状态菜单
function StatusMenu({ 
  book, 
  position, 
  onClose, 
  onStatusChange 
}: { 
  book: Book;
  position: { x: number; y: number };
  onClose: () => void;
  onStatusChange: (bookId: string, status: BookStatus) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const currentStatus = getBookStatus(book);
  
  const options: { status: BookStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { status: 'recent', label: '最近读', icon: <Clock className="w-4 h-4" />, color: 'text-amber-300' },
    { status: 'want', label: '想读', icon: <BookOpen className="w-4 h-4" />, color: 'text-emerald-300' },
    { status: 'backlog', label: '待读', icon: <Archive className="w-4 h-4" />, color: 'text-cyan-300' },
  ];

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg shadow-xl py-1 min-w-[120px]"
      style={{ 
        left: Math.min(position.x, window.innerWidth - 140),
        top: Math.min(position.y, window.innerHeight - 150),
      }}
    >
      <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-700">
        移动到
      </div>
      {options.map(({ status, label, icon, color }) => (
        <button
          key={status}
          onClick={() => {
            onStatusChange(book.id, status);
            onClose();
          }}
          className={cn(
            "w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-700/50 transition-colors",
            currentStatus === status ? color : "text-slate-300"
          )}
        >
          {icon}
          <span>{label}</span>
          {currentStatus === status && (
            <span className="ml-auto text-xs">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

// 书籍卡片 - 大封面 + 长按菜单
function BookCard({ 
  book, 
  gradient, 
  onDelete,
  onStatusChange,
}: { 
  book: Book; 
  gradient: string; 
  onDelete: (e: React.MouseEvent, id: string) => void;
  onStatusChange: (bookId: string, status: BookStatus) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleLongPressStart = (clientX: number, clientY: number) => {
    touchStartPos.current = { x: clientX, y: clientY };
    longPressTimer.current = setTimeout(() => {
      setMenuPosition({ x: clientX, y: clientY });
      setMenuOpen(true);
    }, 500); // 500ms 长按
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    // 移动超过 10px 取消长按
    if (dx > 10 || dy > 10) {
      handleLongPressEnd();
    }
  };

  return (
    <div className="group relative flex flex-col">
      <Link 
        href={`/webread/read/${encodeURIComponent(book.id)}`}
        className="aspect-[2/3] rounded-lg shadow-lg shadow-black/30 group-hover:shadow-xl group-hover:shadow-amber-500/10 transition-all duration-300 relative overflow-hidden block"
        onMouseDown={(e) => handleLongPressStart(e.clientX, e.clientY)}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          handleLongPressStart(touch.clientX, touch.clientY);
        }}
        onTouchEnd={handleLongPressEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setMenuOpen(true);
        }}
        onClick={(e) => {
          if (menuOpen) {
            e.preventDefault();
          }
        }}
      >
        <BookCover book={book} gradient={gradient} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* 进度条 */}
        {book.progress !== undefined && book.progress > 0 && book.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-amber-500" style={{ width: `${book.progress}%` }} />
          </div>
        )}
      </Link>
      
      <button 
        onClick={(e) => onDelete(e, book.id)}
        className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80 z-10"
      >
        <Trash2 className="w-4 h-4 text-white/80" />
      </button>

      <div className="mt-4 space-y-1">
        <h3 className="font-serif text-base leading-tight line-clamp-2 text-slate-200 group-hover:text-amber-200 transition-colors">
          {book.title}
        </h3>
        <p className="text-xs text-slate-500 uppercase tracking-wider">
          {book.author || 'Unknown'}
        </p>
      </div>

      {/* 状态菜单 */}
      {menuOpen && (
        <StatusMenu 
          book={book}
          position={menuPosition}
          onClose={() => setMenuOpen(false)}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
}

// 书架分区
function BookSection({ 
  title, 
  icon,
  books, 
  defaultExpanded = true,
  accentColor,
  onDelete,
  onStatusChange,
  getGradient,
  leftAction,
  rightAction,
}: { 
  title: string;
  icon: React.ReactNode;
  books: Book[];
  defaultExpanded?: boolean;
  accentColor: string;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onStatusChange: (bookId: string, status: BookStatus) => void;
  getGradient: (title: string) => string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  if (books.length === 0) return null;
  
  return (
    <section className="mb-10">
      {/* 分组头部 - 居中简洁 */}
      <div className="flex items-center justify-center gap-3 py-4 mb-4">
        {/* 左侧操作按钮或装饰线 */}
        {leftAction || (
          <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-slate-700" />
        )}
        
        <button 
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full border transition-colors",
            accentColor
          )}
        >
          {icon}
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs opacity-60">{books.length}</span>
          {expanded ? (
            <ChevronDown className="w-3 h-3 opacity-50" />
          ) : (
            <ChevronRight className="w-3 h-3 opacity-50" />
          )}
        </button>
        
        {/* 右侧操作按钮或装饰线 */}
        {rightAction || (
          <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-slate-700" />
        )}
      </div>
      
      {/* 书籍网格 */}
      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-10">
          {books.map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              gradient={getGradient(book.title)}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}


export default function WebReadShelf() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      const rawBooks = await webdavCache.getAllLocalBooks();
      
      const booksWithProgress = await Promise.all(
        rawBooks.map(async (book) => {
          const progress = await webdavCache.getProgress(book.id);
          return {
            ...book,
            lastReadAt: progress?.lastReadAt || 0,
            progress: progress?.progress || 0,
            manualStatus: progress?.manualStatus,
          };
        })
      );
      
      booksWithProgress.sort((a, b) => b.lastReadAt - a.lastReadAt);
      setBooks(booksWithProgress);
      setLoading(false);
      
      // 后台刷新封面，不阻塞 UI
      webdavCache.refreshAllCoversClientSide().catch(() => {});
    } catch (err) {
      console.error('Failed to load books', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    syncCloudBooks();
    
    const handleFocus = () => loadBooks();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadBooks();
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadBooks]);

  const syncCloudBooks = async () => {
    try {
      setSyncing(true);
      const result = await webdavCache.syncBooksFromCloud();
      await webdavCache.refreshAllCoversClientSide();
      if (result.synced > 0) await loadBooks();
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.epub')) {
      alert('请选择 EPUB 文件');
      return;
    }

    setUploading(true);
    try {
      const bookId = `${file.name.replace('.epub', '')}-${Date.now()}`;
      const configResponse = await fetch('/api/webread/webdav-config');
      const config = configResponse.ok ? await configResponse.json() : null;
      
      let coverUrl = '';
      if (config) {
        const coverPath = config.ebookPath.replace('/file', '/cover').replace(/\/$/, '');
        const baseUrl = config.url.replace(/\/$/, '');
        coverUrl = `${baseUrl}${coverPath}/${bookId}.jpeg`;
      }

      const metadata: webdavCache.BookMetadata = {
        id: bookId,
        title: file.name.replace('.epub', ''),
        author: 'Unknown',
        coverUrl: coverUrl,
        fileSize: file.size,
        uploadDate: Date.now(),
        lastModified: Date.now(),
      };

      await webdavCache.setBook(bookId, file, metadata);
      await loadBooks();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('上传失败，请检查 WebDAV 配置');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确认删除这本书吗？')) return;

    try {
      await webdavCache.deleteBook(id);
      setBooks(books.filter(b => b.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('删除失败');
    }
  };

  const handleStatusChange = async (bookId: string, status: BookStatus) => {
    try {
      await webdavCache.setBookStatus(bookId, status);
      // 更新本地状态
      setBooks(books.map(b => 
        b.id === bookId ? { ...b, manualStatus: status } : b
      ));
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const getBookGradient = (title: string) => {
    const gradients = [
      'from-indigo-900 via-purple-900 to-slate-900',
      'from-emerald-900 via-teal-900 to-slate-900',
      'from-amber-900 via-orange-900 to-slate-900',
      'from-rose-900 via-pink-900 to-slate-900',
      'from-cyan-900 via-blue-900 to-slate-900',
      'from-violet-900 via-fuchsia-900 to-slate-900',
    ];
    const index = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
    return gradients[index];
  };

  // 按状态分组
  const recentBooks = books.filter(b => getBookStatus(b) === 'recent');
  const wantBooks = books.filter(b => getBookStatus(b) === 'want');
  const backlogBooks = books.filter(b => getBookStatus(b) === 'backlog');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 text-gray-100">
      <WebDAVConfigPanel />

      {/* Main */}
      <main className="px-6 py-8 md:px-12 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center pt-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500/50" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center pt-32 text-slate-500 font-serif">
            <BookIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-slate-400">书架是空的</p>
            <p className="text-sm mt-2 text-slate-600">导入《你一生的故事》开始体验</p>
            <label className="cursor-pointer inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">导入书籍</span>
              <input type="file" accept=".epub" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        ) : (
          <>
            {/* 最近读 - 带操作按钮 */}
            <BookSection 
              title="最近读" 
              icon={<Clock className="w-4 h-4 text-amber-300" />}
              books={recentBooks}
              defaultExpanded={true}
              accentColor="border-amber-500/40 bg-amber-500/10 text-amber-300"
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              getGradient={getBookGradient}
              leftAction={
                <button 
                  onClick={() => syncCloudBooks()}
                  disabled={syncing}
                  className="p-2 rounded-full border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors"
                  title="同步"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-400 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              }
              rightAction={
                <label className={`cursor-pointer p-2 rounded-full border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`} title="导入">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4 text-slate-400" />}
                  <input type="file" accept=".epub" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              }
            />
            
            {/* 想读 */}
            <BookSection 
              title="想读" 
              icon={<BookOpen className="w-4 h-4 text-emerald-300" />}
              books={wantBooks}
              defaultExpanded={wantBooks.length <= 10}
              accentColor="border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              getGradient={getBookGradient}
            />
            
            {/* 待读 */}
            <BookSection 
              title="待读" 
              icon={<Archive className="w-4 h-4 text-cyan-300" />}
              books={backlogBooks}
              defaultExpanded={false}
              accentColor="border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              getGradient={getBookGradient}
            />
          </>
        )}
      </main>
    </div>
  );
}
