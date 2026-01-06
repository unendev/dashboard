'use client';

import React, { useState, useEffect } from 'react';
import { Gamepad2, Trophy, Sword, Users, Clock, AlertCircle, Target, TrendingUp, MapPin, Package, Zap } from 'lucide-react';

interface ERGameData {
  characterNum: number;
  characterName: string;
  characterCode: string;
  characterAvatar: string;
  characterLevel: number;
  gameRank: number;
  playerKill: number;
  playerDeaths: number;
  playerAssistant: number;
  damageToPlayer: number;
  mmrAfter: number;
  mmrGain: number;
  matchingMode: number;
  matchingModeName: string;
  matchingTeamMode: number;
  matchingTeamModeName: string;
  playTime: number;
  playTimeFormatted: string;
  startDtm: string;
  timeAgo: string;
  routeIdOfStart: number;
  equipment: Array<{
    slot: string;
    itemId: number;
    name: string;
    iconUrl: string;
  }>;
  traits: Array<{
    id: number;
    name: string;
    iconUrl: string;
    type: string;
  }>;
  gameId: number;
  nickname: string;
  lastPlayed: string;
}

// interface ERError {
//   error: string;
//   message: string;
// }

import { safeFetchJSON } from '@/lib/fetch-utils';

const EternalReturnCard = () => {
  const [gameData, setGameData] = useState<ERGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // setIsClient(true);
    fetchGameData();
  }, []);

  const fetchGameData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await safeFetchJSON<ERGameData>('/api/eternal-return', {}, 0);
      setGameData(data);
    } catch (err) {
      console.error('Error fetching Eternal Return data:', err);
      setError(err instanceof Error ? err.message : '获取游戏数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank <= 3) return 'text-orange-400';
    if (rank <= 10) return 'text-green-400';
    return 'text-blue-400';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🏆';
  };

  if (loading) {
    return (
      <div className="module-card rounded-2xl hover-lift">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <div className="text-white/60 text-lg">加载游戏数据中...</div>
              <div className="text-white/40 text-sm mt-2">正在获取 Eternal Return 最新战绩</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="module-card rounded-2xl hover-lift">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <div className="text-red-400 text-lg mb-2">数据加载失败</div>
              <div className="text-white/60 text-sm mb-4">{error}</div>
              <button
                onClick={fetchGameData}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="module-card rounded-2xl hover-lift">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Gamepad2 className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <div className="text-white/60 text-lg">暂无游戏数据</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-card rounded-2xl hover-lift">
      <div className="p-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600/20 rounded-xl">
              <Gamepad2 className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Eternal Return</h3>
              <p className="text-white/60 text-sm">最新战绩</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/40 text-xs">游戏ID</div>
            <div className="text-white/60 text-sm font-mono">#{gameData.gameId}</div>
          </div>
        </div>

        {/* 角色信息 */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {gameData.characterName.charAt(0)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">✓</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-lg font-semibold text-white">{gameData.characterName}</h4>
              <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-md">
                Lv.{gameData.characterLevel}
              </span>
            </div>
            <p className="text-white/60 text-sm">角色 #{gameData.characterNum} ({gameData.characterCode})</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-md">
                {gameData.matchingModeName}
              </span>
              <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-md">
                {gameData.matchingTeamModeName}
              </span>
            </div>
          </div>
        </div>

        {/* 战绩信息 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* 排名 */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-white/60 text-sm">最终排名</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getRankIcon(gameData.gameRank)}</span>
              <span className={`text-2xl font-bold ${getRankColor(gameData.gameRank)}`}>
                #{gameData.gameRank}
              </span>
            </div>
          </div>

          {/* K/D/A */}
          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-xl p-4 border border-red-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <Sword className="h-5 w-5 text-red-400" />
              <span className="text-white/60 text-sm">K/D/A</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {gameData.playerKill}/{gameData.playerDeaths}/{gameData.playerAssistant}
            </div>
          </div>

          {/* 伤害 */}
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-5 w-5 text-orange-400" />
              <span className="text-white/60 text-sm">造成伤害</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {gameData.damageToPlayer.toLocaleString()}
            </div>
          </div>

          {/* RP变化 */}
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-white/60 text-sm">RP变化</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white">{gameData.mmrAfter}</span>
              <span className={`text-sm font-semibold ${gameData.mmrGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {gameData.mmrGain >= 0 ? '+' : ''}{gameData.mmrGain}
              </span>
            </div>
          </div>
        </div>

        {/* 游戏模式信息 */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-white/60 text-sm">游戏模式</span>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold">
                {gameData.matchingModeName} - {gameData.matchingTeamModeName}
              </div>
              <div className="text-white/40 text-xs">
                Mode: {gameData.matchingMode} | Team: {gameData.matchingTeamMode}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* 游戏时长 */}
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <div>
                <div className="text-white/60 text-xs">游戏时长</div>
                <div className="text-white font-semibold">{gameData.playTimeFormatted}</div>
              </div>
            </div>
            
            {/* 路线ID */}
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <div>
                <div className="text-white/60 text-xs">起始路线</div>
                <div className="text-white font-semibold">#{gameData.routeIdOfStart}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 装备信息 */}
        {gameData.equipment && gameData.equipment.length > 0 && (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20 mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <Package className="h-5 w-5 text-purple-400" />
              <span className="text-white/60 text-sm">装备</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {gameData.equipment.slice(0, 6).map((item, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-2 text-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded mx-auto mb-1 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {item.name.charAt(0)}
                    </span>
                  </div>
                  <div className="text-white/60 text-xs truncate">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 特质信息 */}
        {gameData.traits && gameData.traits.length > 0 && (
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl p-4 border border-green-500/20 mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="h-5 w-5 text-green-400" />
              <span className="text-white/60 text-sm">特质</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {gameData.traits.map((trait, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-400 rounded flex items-center justify-center">
                      <span className="text-xs text-white font-bold">
                        {trait.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{trait.name}</div>
                      <div className="text-white/40 text-xs">{trait.type}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-white/40" />
            <span className="text-white/40 text-sm">游戏时间</span>
          </div>
          <div className="text-white/60 text-sm">
            {gameData.timeAgo}
          </div>
        </div>

        {/* 刷新按钮 */}
        <div className="mt-4">
          <button
            onClick={fetchGameData}
            className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-medium"
          >
            刷新数据
          </button>
        </div>
      </div>
    </div>
  );
};

export default EternalReturnCard;



