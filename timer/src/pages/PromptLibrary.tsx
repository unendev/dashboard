import React, { useState, useRef } from 'react';
import { Search, Plus, X, Copy, Edit2, Trash2, Download, Upload, Check } from 'lucide-react';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import type { Prompt } from '@/lib/types/prompt';

export default function PromptLibrary() {
    const {
        prompts,
        categories,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        createPrompt,
        updatePrompt,
        deletePrompt,
        incrementUsage,
        exportPrompts,
        importPrompts
    } = usePromptLibrary();

    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 复制到剪贴板
    const handleCopy = async (prompt: Prompt) => {
        await navigator.clipboard.writeText(prompt.content);
        incrementUsage(prompt.id);
        setCopiedId(prompt.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // 编辑器组件
    const PromptEditor = ({ prompt, onSave, onCancel }: {
        prompt?: Prompt;
        onSave: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
        onCancel: () => void;
    }) => {
        const [title, setTitle] = useState(prompt?.title || '');
        const [content, setContent] = useState(prompt?.content || '');
        const [category, setCategory] = useState(prompt?.category || '');

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!title.trim() || !content.trim()) return;

            onSave({
                title: title.trim(),
                content: content.trim(),
                category: category.trim() || '未分类',
                tags: []
            });
        };

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" data-drag="false">
                <div className="bg-[#1a1a1a] rounded-lg border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between" data-drag="true">
                        <h2 className="text-sm font-medium text-zinc-300">
                            {prompt ? '编辑提示词' : '新建提示词'}
                        </h2>
                        <button
                            onClick={onCancel}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            data-drag="false"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3" data-drag="false">
                        {/* Title */}
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">标题</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:border-zinc-600 focus:outline-none"
                                placeholder="如：Python 代码生成助手"
                                autoFocus
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">分类（用 / 分隔）</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:border-zinc-600 focus:outline-none"
                                placeholder="如：AI助手/代码生成/Python"
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">提示词内容</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:border-zinc-600 focus:outline-none resize-none font-mono"
                                placeholder="输入提示词内容..."
                                rows={16}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                            >
                                保存
                            </button>
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-sm transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-zinc-900 text-zinc-300 overflow-hidden">
            {/* Header */}
            <header className="h-10 flex items-center justify-between px-4 bg-[#1a1a1a] border-b border-zinc-800 shrink-0" data-drag="true">
                <div className="flex items-center gap-3">
                    <h1 className="text-sm font-medium">提示词库</h1>
                    <span className="text-xs text-zinc-600">{prompts.length} 条</span>
                </div>

                <div className="flex items-center gap-2" data-drag="false">
                    {/* Import */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                        title="导入"
                    >
                        <Upload size={14} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) importPrompts(file);
                            e.target.value = '';
                        }}
                        className="hidden"
                    />

                    {/* Export */}
                    <button
                        onClick={exportPrompts}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                        title="导出"
                    >
                        <Download size={14} />
                    </button>

                    {/* New */}
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
                    >
                        <Plus size={14} />
                        新建
                    </button>

                    {/* Close */}
                    <button
                        onClick={() => window.close()}
                        className="p-1.5 text-zinc-500 hover:text-white hover:bg-red-500/20 rounded transition-colors"
                        title="关闭"
                    >
                        <X size={14} />
                    </button>
                </div>
            </header>

            {/* Search Bar */}
            <div className="px-4 py-3 bg-[#161616] border-b border-zinc-800 shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded pl-9 pr-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                        placeholder="搜索提示词标题、内容..."
                    />
                </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
                <div className="px-4 py-2 bg-[#161616] border-b border-zinc-800 shrink-0">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-2 py-1 rounded text-xs transition-colors ${!selectedCategory ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >
                            全部
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.path}
                                onClick={() => setSelectedCategory(cat.path)}
                                className={`px-2 py-1 rounded text-xs transition-colors ${selectedCategory === cat.path ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                            >
                                {cat.name} ({cat.count})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4">
                {prompts.length === 0 ? (
                    <div className="text-center text-zinc-600 text-sm py-12">
                        {searchQuery ? '未找到匹配的提示词' : '暂无提示词，点击右上角"新建"开始创建'}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {prompts.map(prompt => (
                            <div
                                key={prompt.id}
                                className="bg-[#1a1a1a] border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors group cursor-pointer relative"
                                onClick={() => handleCopy(prompt)}
                                title="点击复制"
                            >
                                {/* Title */}
                                <h3 className="text-sm font-medium text-zinc-300 truncate mb-2">{prompt.title}</h3>

                                {/* Content Preview */}
                                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-2">
                                    {prompt.content}
                                </p>

                                {/* Footer: Usage Count + Actions */}
                                <div className="flex items-center justify-between">
                                    {prompt.usageCount > 0 ? (
                                        <span className="text-[10px] text-zinc-600">使用 {prompt.usageCount} 次</span>
                                    ) : (
                                        <span className="text-[10px] text-zinc-700">未使用</span>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(prompt);
                                            }}
                                            className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                                            title="复制"
                                        >
                                            {copiedId === prompt.id ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingPrompt(prompt);
                                            }}
                                            className="p-1 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                            title="编辑"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('确定删除这条提示词吗？')) {
                                                    deletePrompt(prompt.id);
                                                }
                                            }}
                                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                            title="删除"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Copy Indicator */}
                                {copiedId === prompt.id && (
                                    <div className="absolute inset-0 bg-emerald-500/10 rounded-lg flex items-center justify-center pointer-events-none">
                                        <span className="text-emerald-400 text-xs font-medium">已复制</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Editors */}
            {isCreating && (
                <PromptEditor
                    onSave={(data) => {
                        createPrompt(data);
                        setIsCreating(false);
                    }}
                    onCancel={() => setIsCreating(false)}
                />
            )}

            {editingPrompt && (
                <PromptEditor
                    prompt={editingPrompt}
                    onSave={(data) => {
                        updatePrompt(editingPrompt.id, data);
                        setEditingPrompt(null);
                    }}
                    onCancel={() => setEditingPrompt(null)}
                />
            )}
        </div>
    );
}
