'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface YouTubeLikedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  url: string;
  likedAt?: string;
}

interface YouTubeLikedApiResponse {
  success: boolean;
  data?: YouTubeLikedVideo[];
  message?: string;
}

const YouTubeCard: React.FC = () => {
  const [videos, setVideos] = useState<YouTubeLikedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLikedVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/youtube/liked');
        const data: YouTubeLikedApiResponse = await response.json();
        
        if (data.success && data.data) {
          setVideos(data.data);
        } else {
          setError(data.message || '获取喜欢视频失败');
        }
      } catch (err) {
        console.error('Failed to fetch liked videos:', err);
        setError('网络请求失败');
      } finally {
        setLoading(false);
      }
    };

    fetchLikedVideos();
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">❤️ YouTube</h2>
          <p className="text-white/60 text-sm">我喜欢的视频</p>
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
          <h2 className="text-2xl font-bold gradient-text mb-1">❤️ YouTube</h2>
          <p className="text-white/60 text-sm">我喜欢的视频</p>
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

  if (videos.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">❤️ YouTube</h2>
          <p className="text-white/60 text-sm">我喜欢的视频</p>
        </div>
        
        <div className="text-center py-8">
          <div className="text-white/40 mb-2">❤️</div>
          <p className="text-white/60">暂无喜欢的视频</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold gradient-text mb-1">❤️ YouTube</h2>
        <p className="text-white/60 text-sm">我喜欢的视频</p>
      </div>

      <div className="space-y-4">
        {videos.slice(0, 3).map((video) => (
          <a
            key={video.id}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="flex gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]">
              <div className="relative overflow-hidden rounded-lg flex-shrink-0">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  width={128}
                  height={80}
                  className="w-32 h-20 object-cover"
                  loading="lazy"
                />
                
                {/* 播放按钮 */}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
                
                {/* 时长标签 */}
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                  {video.duration}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold line-clamp-2 group-hover:text-blue-300 transition-colors mb-2">
                  {video.title}
                </h3>
                
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <span className="font-medium">{video.channelTitle}</span>
                  <span>•</span>
                  <span>{video.viewCount} 次观看</span>
                </div>
                
                <p className="text-white/50 text-sm line-clamp-2 mb-2">
                  {video.description}
                </p>
                
                <div className="flex items-center justify-between text-white/40 text-xs">
                  <span>发布时间: {video.publishedAt}</span>
                  {video.likedAt && (
                    <span className="text-pink-400">❤️ {video.likedAt}</span>
                  )}
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
        
        {videos.length > 3 && (
          <div className="text-center pt-4">
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors">
              查看更多 ({videos.length - 3} 个)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeCard;



