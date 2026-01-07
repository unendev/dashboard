'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDevSession } from '@/app/hooks/useDevSession';
import { ArrowLeft, Tag, Trash2, Plus, Loader2, Search, AlertTriangle } from 'lucide-react';

interface InstanceTag {
    id: string;
    name: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export default function TagsManagementPage() {
    const { data: session } = useDevSession();
    const userId = session?.user?.id || 'user-1';

    const [tags, setTags] = useState<InstanceTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 获取所有标签
    const fetchTags = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/instance-tags?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setTags(data);
            } else {
                setError('获取标签失败');
            }
        } catch (err) {
            setError('网络错误，请稍后重试');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchTags();
        }
    }, [userId]);

    // 创建标签
    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        setIsCreating(true);
        setError(null);
        try {
            const response = await fetch('/api/instance-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTagName.trim(), userId })
            });

            if (response.ok) {
                const newTag = await response.json();
                setTags(prev => [newTag, ...prev]);
                setNewTagName('');
            } else if (response.status === 409) {
                setError('该标签已存在');
            } else {
                setError('创建标签失败');
            }
        } catch (err) {
            setError('网络错误，请稍后重试');
        } finally {
            setIsCreating(false);
        }
    };

    // 删除标签
    const handleDeleteTag = async (tag: InstanceTag) => {
        if (!window.confirm(`确定要删除标签 "${tag.name}" 吗？\n\n注意：这将同时移除所有任务与此标签的关联。`)) {
            return;
        }

        setDeletingId(tag.id);
        setError(null);
        try {
            const response = await fetch(`/api/instance-tags/${tag.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setTags(prev => prev.filter(t => t.id !== tag.id));
            } else {
                setError('删除标签失败');
            }
        } catch (err) {
            setError('网络错误，请稍后重试');
        } finally {
            setDeletingId(null);
        }
    };

    // 过滤标签
    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-zinc-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/log"
                            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Tag size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">事务项管理</h1>
                                <p className="text-xs text-zinc-500">管理您的任务标签</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-sm text-zinc-500">
                        共 {tags.length} 个标签
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                        <AlertTriangle size={20} />
                        <span>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto hover:text-red-300"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Create New Tag */}
                <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                    <h2 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">创建新标签</h2>
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">#</span>
                            <input
                                type="text"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                                placeholder="输入标签名称..."
                                className="w-full pl-8 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleCreateTag}
                            disabled={!newTagName.trim() || isCreating}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                        >
                            {isCreating ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Plus size={18} />
                            )}
                            创建
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索标签..."
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                    />
                </div>

                {/* Tags List */}
                <div className="space-y-2">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                            <Loader2 size={32} className="animate-spin mb-4" />
                            <span>加载中...</span>
                        </div>
                    ) : filteredTags.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                            <Tag size={48} className="mb-4 opacity-50" />
                            <span>{searchQuery ? '没有找到匹配的标签' : '还没有创建任何标签'}</span>
                        </div>
                    ) : (
                        filteredTags.map((tag) => (
                            <div
                                key={tag.id}
                                className="group px-5 py-4 bg-zinc-900/30 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700 rounded-xl flex items-center justify-between transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <Tag size={16} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <span className="text-white font-medium">{tag.name}</span>
                                        <span className="text-xs text-zinc-600 ml-3">
                                            创建于 {new Date(tag.createdAt).toLocaleDateString('zh-CN')}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteTag(tag)}
                                    disabled={deletingId === tag.id}
                                    className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                    title="删除标签"
                                >
                                    {deletingId === tag.id ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={18} />
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
