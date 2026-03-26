'use client';

import React from 'react';
import { FeedItem } from '@/lib/rss';
import { MarkdownView } from '@/app/components/shared/MarkdownView';

interface FeedCardProps {
    item: FeedItem;
    theme?: string;
    textTheme?: string;
    subTextTheme?: string;
}

export const FeedCard: React.FC<FeedCardProps> = ({ item, theme, textTheme, subTextTheme }) => {
    const cardClass = theme || 'bg-[#09090b] border border-zinc-900 hover:border-zinc-700';
    const textClass = textTheme || 'text-zinc-200';
    const subTextClass = subTextTheme || 'text-zinc-500';

    const [showAnalysis, setShowAnalysis] = React.useState(false);
    const [showComments, setShowComments] = React.useState(false);
    const [comments, setComments] = React.useState<any[]>([]);
    const [loadingComments, setLoadingComments] = React.useState(false);

    const fetchComments = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (comments.length > 0) {
            setShowComments(!showComments);
            setShowAnalysis(false);
            return;
        }

        setLoadingComments(true);
        setShowComments(true);
        setShowAnalysis(false);
        try {
            const res = await fetch(`/api/feeds/comments?postId=${item.id}`);
            const data = await res.json();
            if (data.comments) {
                setComments(data.comments);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    // Extract images
    let heroImage = item.imageUrl || null;
    if (!heroImage && item.content) {
        const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) heroImage = imgMatch[1];
    }
    if (!heroImage && item.contentSnippet) {
        const imgMatch = item.contentSnippet.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) heroImage = imgMatch[1];
    }

    return (
        <div
            className={`group relative p-4 rounded-lg transition-all duration-300 ${cardClass} ${(showAnalysis || showComments) ? 'ring-1 ring-emerald-500/30' : ''}`}
        >
            {/* AI Summary & Comments Overlay */}
            {(showAnalysis || showComments) && (
                <div className="absolute inset-0 bg-zinc-950/98 backdrop-blur-md p-5 transition-all duration-300 z-20 flex flex-col select-none">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <button 
                                className={`flex items-center gap-2 transition-colors ${showAnalysis ? 'text-emerald-400' : 'text-zinc-500'}`}
                                onClick={(e) => { e.stopPropagation(); setShowAnalysis(true); setShowComments(false); }}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${showAnalysis ? 'bg-emerald-500 animate-pulse' : 'bg-transparent'}`} />
                                AI Analysis
                            </button>
                            <button 
                                className={`flex items-center gap-2 transition-colors ${showComments ? 'text-emerald-400' : 'text-zinc-500'}`}
                                onClick={(e) => { e.stopPropagation(); setShowComments(true); setShowAnalysis(false); }}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${showComments ? 'bg-emerald-500 animate-pulse' : 'bg-transparent'}`} />
                                Community Comments
                            </button>
                        </div>
                        <button className="text-zinc-500 hover:text-zinc-300 p-1" onClick={(e) => { e.stopPropagation(); setShowAnalysis(false); setShowComments(false); }}>✕</button>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2">
                        {showAnalysis && (
                            <MarkdownView
                                content={item.summary || (item.metadata as any)?.aiAnalysis || "No analysis available."}
                                variant="goc"
                                className="text-sm text-zinc-200 leading-relaxed"
                            />
                        )}
                        {showComments && (
                            <div className="space-y-4">
                                {loadingComments ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                    </div>
                                ) : comments.length > 0 ? (
                                    comments.map((comment, i) => (
                                        <div key={comment.id || i} className="border-l-2 border-zinc-800 pl-3 py-1">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-[10px] font-bold text-emerald-500/80">@{comment.author}</span>
                                                <span className="text-[9px] text-zinc-600">👍 {comment.score}</span>
                                            </div>
                                            <p className="text-xs text-zinc-400 leading-normal">{comment.body}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-xs text-zinc-600">No comments found.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header: Source & Date */}
            <div className={`flex items-center gap-2 mb-3 text-[10px] font-medium ${subTextClass}`}>
                <span className={`uppercase tracking-wider truncate max-w-[120px] transition-colors ${theme ? 'opacity-70 group-hover:opacity-100' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                    {item.source.replace('Reddit ', '')}
                </span>
                <span className="opacity-50">·</span>
                <span className="opacity-70">
                    {item.isoDate
                        ? new Date(item.isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : 'Live'}
                </span>
            </div>

            {/* Hero Image */}
            {heroImage && (
                <div className={`mb-3 rounded overflow-hidden aspect-video border  ${theme ? 'border-transparent bg-black/5' : 'bg-zinc-900 border-zinc-800'}`}>
                    <img
                        src={heroImage}
                        alt={item.title}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.parentElement) target.parentElement.style.display = 'none';
                        }}
                    />
                </div>
            )}

            {/* Content */}
            <h3 className={`text-sm font-medium mb-2 leading-relaxed break-words transition-colors ${textClass} relative z-10`}>
                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline focus:outline-none hover:text-emerald-400 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    {item.title}
                </a>
            </h3>

            <div className={`text-xs line-clamp-3 mb-3 font-normal leading-relaxed break-words transition-colors ${subTextClass} relative z-10`}>
                {item.contentSnippet
                    ? item.contentSnippet.replace(/&#8230;/g, '...').replace(/&nbsp;/g, ' ').slice(0, 140)
                    : item.content?.replace(/<[^>]+>/g, '').slice(0, 100) + '...'
                }
            </div>

            {/* Metadata Badges at bottom */}
            <div className="mt-3 flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowAnalysis(!showAnalysis); setShowComments(false); }}
                        className={`text-[10px] flex items-center gap-1 transition-colors ${showAnalysis ? 'text-emerald-400' : subTextClass} hover:text-emerald-400`}
                        title="AI Insight"
                    >
                        <span>✨ AI</span>
                    </button>
                    {(item.metadata as any)?.score !== undefined && (
                        <div className={`text-[10px] flex items-center gap-1 ${subTextClass}`}>
                            <span>👍</span> {(item.metadata as any).score}
                        </div>
                    )}
                    {(item.metadata as any)?.num_comments !== undefined && (
                        <button 
                            onClick={fetchComments}
                            className={`text-[10px] flex items-center gap-1 hover:text-emerald-400 transition-colors ${showComments ? 'text-emerald-400' : subTextClass}`}
                        >
                            <span>💬</span> {(item.metadata as any).num_comments}
                        </button>
                    )}
                </div>
                
                {item.categories && item.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                        {item.categories.slice(0, 2).map(tag => (
                            <span key={tag} className={`px-1.5 py-0.5 text-[9px] rounded border opacity-70 ${theme ? 'border-transparent bg-black/5' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
