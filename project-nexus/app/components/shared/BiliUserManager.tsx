'use client';

import React, { useState, useEffect } from 'react';
import { BiliUser } from '@/types/bili-user';

const BiliUserManager = () => {
  const [users, setUsers] = useState<BiliUser[]>([]);
  const [newUid, setNewUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 加载UP主列表
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/bili-users');
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 添加UP主
  const addUser = async () => {
    if (!newUid.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/bili-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: parseInt(newUid.trim()) }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers([...users, data.user]);
        setNewUid('');
        setMessage('UP主添加成功！');
      } else {
        const errorData = await response.json();
        setMessage(`添加失败: ${errorData.error}`);
      }
    } catch {
      setMessage('添加失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 切换UP主状态
  const toggleUser = async (uid: number, enabled: boolean) => {
    try {
      const response = await fetch('/api/bili-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, enabled }),
      });

      if (response.ok) {
        setUsers(users.map(user =>
          user.uid === uid ? { ...user, enabled } : user
        ));
      }
    } catch (error) {
      console.error('Failed to toggle user:', error);
    }
  };

  // 删除UP主
  const deleteUser = async (uid: number) => {
    if (!confirm('确定要删除这个UP主吗？')) return;

    try {
      const response = await fetch('/api/bili-users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });

      if (response.ok) {
        setUsers(users.filter(user => user.uid !== uid));
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-6 hover-lift">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold gradient-text mb-1">UP主管理</h2>
        <p className="text-white/60 text-sm">管理要监控的bilibili UP主</p>
      </div>

      {/* 添加新UP主 */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="输入UP主UID"
            value={newUid}
            onChange={(e) => setNewUid(e.target.value)}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={addUser}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {loading ? '添加中...' : '添加'}
          </button>
        </div>
        {message && (
          <p className={`text-sm mt-2 ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
        <p className="text-xs text-white/40 mt-2">
          提示：UP主UID可以在bilibili空间页面的URL中找到
        </p>
      </div>

      {/* UP主列表 */}
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff&size=32`}
                alt={user.name}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff&size=32`;
                }}
              />
              <div>
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-xs text-white/60">UID: {user.uid}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={user.enabled}
                  onChange={(e) => toggleUser(user.uid, e.target.checked)}
                  className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
                />
                <span className="text-sm text-white/80">监控</span>
              </label>

              <button
                onClick={() => deleteUser(user.uid)}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
              >
                <span className="text-sm">✕</span>
              </button>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <p>还没有添加任何UP主</p>
            <p className="text-xs mt-1">添加UP主后会自动监控他们的最新视频</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiliUserManager;


