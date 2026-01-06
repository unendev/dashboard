'use client';

import React, { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { markManualLogout } from '@/app/hooks/useDevSession';

interface YouTubeAuthCardProps {
  onAuthSuccess?: () => void;
}

const YouTubeAuthCard: React.FC<YouTubeAuthCardProps> = () => {
  const { data: session, status } = useSession();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsConnecting(true);
      // 使用Google提供商进行OAuth登录
      await signIn('google', { 
        callbackUrl: '/',
        redirect: true  // 改为true以进行重定向
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      markManualLogout(); // 标记手动登出，防止自动重新登录
      await signOut({ redirect: false });
      window.location.reload();
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  if (status === 'loading') {
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

  if (!session) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold gradient-text mb-1">❤️ YouTube</h2>
          <p className="text-white/60 text-sm">我喜欢的视频</p>
        </div>
        
        <div className="text-center py-8">
          <div className="text-white/40 mb-4 text-4xl">🔐</div>
          <h3 className="text-white font-semibold mb-2">连接您的YouTube账户</h3>
          <p className="text-white/60 text-sm mb-6">
            登录以查看您真正喜欢的YouTube视频
          </p>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={isConnecting}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 rounded-lg text-white font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                连接中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                使用Google账户登录
              </>
            )}
          </button>
          
          <p className="text-white/40 text-xs mt-4">
            我们将只读取您的YouTube喜欢列表，不会修改任何内容
          </p>
        </div>
      </div>
    );
  }

  // 用户已登录，显示连接状态
  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold gradient-text mb-1">❤️ YouTube</h2>
        <p className="text-white/60 text-sm">我喜欢的视频</p>
      </div>
      
      <div className="text-center py-8">
        <div className="text-green-400 mb-4 text-4xl">✅</div>
        <h3 className="text-white font-semibold mb-2">已连接YouTube账户</h3>
        <p className="text-white/60 text-sm mb-4">
          欢迎，{session.user?.name || session.user?.email}
        </p>
        
        {/* 检查是否已连接Google账户 */}
        {session.user?.image ? (
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src={session.user.image} 
              alt="Google头像" 
              className="w-8 h-8 rounded-full"
            />
            <span className="text-white/80 text-sm">
              已连接Google账户
            </span>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ 请使用Google账户登录以获取YouTube数据
            </p>
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
          >
            刷新视频列表
          </button>
          
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            断开连接
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouTubeAuthCard;



