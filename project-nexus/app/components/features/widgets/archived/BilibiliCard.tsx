'use client';

import React from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';

interface FeedItem {
  source: string;
  avatar: string;
  author: string;
  title: string;
  summary: string;
  timestamp: string;
  bvid?: string;
  url?: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const BilibiliCard: React.FC = () => {
  const { data: feeds, error } = useSWR<FeedItem[]>('/api/bilibili-feeds', fetcher, { revalidateOnFocus: false });

  if (error) return <div className="p-6 h-full flex items-center justify-center text-red-400">加载B站动态失败</div>;
  if (!feeds || !Array.isArray(feeds)) return <div className="p-6 h-full flex items-center justify-center text-white/60">加载B站动态中...</div>;

  // Group feeds by author
  const feedsByAuthor: { [key: string]: FeedItem[] } = feeds.reduce((acc, item) => {
    if (!acc[item.author]) {
      acc[item.author] = [];
    }
    acc[item.author].push(item);
    return acc;
  }, {} as { [key: string]: FeedItem[] });

  return (
    <Card className="p-6 h-full flex flex-col bg-transparent border-none shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-medium text-white">B站动态</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {Object.entries(feedsByAuthor).map(([author, items]) => (
          <div key={author} className="mb-6 last:mb-0">
            <div className="flex items-center mb-3">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage src={items[0]?.avatar} alt={author} />
                <AvatarFallback>{author.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold text-white">{author}</h3>
            </div>
            {items.map((item, index) => (
              <a key={index} href={item.url} target="_blank" rel="noopener noreferrer" className="block mb-3 last:mb-0 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200">
                <h4 className="text-base font-medium text-white mb-1">{item.title}</h4>
                <p className="text-sm text-white/70 mb-1">{item.summary}</p>
                <p className="text-xs text-white/50">{new Date(item.timestamp).toLocaleDateString()}</p>
              </a>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default BilibiliCard;



