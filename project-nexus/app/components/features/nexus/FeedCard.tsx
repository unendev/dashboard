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
    // Default Fallbacks if no theme provided (e.g. initial render or separate use)
    const cardClass = theme || 'bg-[#09090b] border border-zinc-900 hover:border-zinc-700';
    const textClass = textTheme || 'text-zinc-200';
    const subTextClass = subTextTheme || 'text-zinc-500';

    const [showAnalysis, setShowAnalysis] = React.useState(false);

    // Extract images
    let heroImage = item.imageUrl || null;

    // Fallback: Parse HTML content if generic imageUrl is empty
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
            className={`group relative p-4 rounded-lg transition-all duration-300 ${cardClass} cursor-pointer ${showAnalysis ? 'ring-2 ring-emerald-500/50' : ''}`}
            onClick={() => setShowAnalysis(!showAnalysis)}
        >

            {/* AI Summary Overlay (Click to Toggle) */}
            {(item.summary || (item.metadata as any)?.aiAnalysis) && (
                <div className={`absolute inset-0 bg-zinc-950/95 backdrop-blur-md p-5 transition-all duration-300 z-20 flex flex-col justify-center select-none ${showAnalysis ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            AI Analysis
                        </div>
                        <button className="text-zinc-500 hover:text-zinc-300" onClick={(e) => { e.stopPropagation(); setShowAnalysis(false); }}>✕</button>
                    </div>
                    {/* Markdown Content Container */}
                    <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2">
                        <MarkdownView
                            content={item.summary || (item.metadata as any)?.aiAnalysis}
                            variant="goc"
                            className="text-sm text-zinc-200 leading-relaxed [&>p]:mb-2 [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-emerald-400 [&>h2]:mt-2 [&>h2]:mb-1 [&>ul]:list-disc [&>ul]:pl-4"
                        />
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

            {/* Tags */}
            {item.categories && item.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 relative z-10">
                    {item.categories.slice(0, 2).map(tag => (
                        <span key={tag} className={`px-1.5 py-0.5 text-[9px] rounded border opacity-70 ${theme ? 'border-transparent bg-black/5' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
