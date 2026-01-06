'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
  publishedAt: string;
  url: string;
}

interface YouTubePlaylistApiResponse {
  success: boolean;
  data?: YouTubePlaylist[];
  message?: string;
}

const YouTubePlaylistCard: React.FC = () => {
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/youtube/playlists');
        const data: YouTubePlaylistApiResponse = await response.json();
        
        if (data.success && data.data) {
          setPlaylists(data.data);
        } else {
          setError(data.message || '获取播放列表失败');
        }
      } catch (err) {
        console.error('Failed to fetch YouTube playlists:', err);
        setError('网络请求失败');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">📺 YouTube</h2>
          <p className="text-white/60 text-sm">推荐播放列表</p>
        </div>
        
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="bg-white/10 rounded-lg h-20 w-32"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-white/10 rounded h-4 w-3/4"></div>
                <div className="bg-white/10 rounded h-3 w-1/2"></div>
                <div className="bg-white/10 rounded h-3 w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">📺 YouTube</h2>
          <p className="text-white/60 text-sm">推荐播放列表</p>
        </div>
        
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">⚠️</div>
          <p className="text-white/60 mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">📺 YouTube</h2>
          <p className="text-white/60 text-sm">推荐播放列表</p>
        </div>
        
        <div className="text-center py-8">
          <div className="text-white/40 mb-2">📺</div>
          <p className="text-white/60">暂无播放列表数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold gradient-text mb-1">📺 YouTube</h2>
        <p className="text-white/60 text-sm">推荐播放列表</p>
      </div>

      <div className="space-y-4">
        {playlists.map((playlist) => (
          <a
            key={playlist.id}
            href={playlist.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="flex gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]">
              <div className="relative overflow-hidden rounded-lg flex-shrink-0">
                <Image
                  src={playlist.thumbnail}
                  alt={playlist.title}
                  width={128}
                  height={80}
                  className="w-32 h-20 object-cover"
                  loading="lazy"
                />
                
                {/* 播放列表图标 */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold line-clamp-2 group-hover:text-blue-300 transition-colors mb-2">
                  {playlist.title}
                </h3>
                
                <p className="text-white/60 text-sm line-clamp-2 mb-2">
                  {playlist.description}
                </p>
                
                <div className="flex items-center gap-4 text-white/50 text-xs">
                  <span>{playlist.itemCount} 个视频</span>
                  <span>•</span>
                  <span>{new Date(playlist.publishedAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
              
              <div className="flex items-center text-white/40 group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default YouTubePlaylistCard;





