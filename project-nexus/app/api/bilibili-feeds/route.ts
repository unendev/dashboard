import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BiliUser } from '@/types/bili-user';

// B站视频数据类型
interface BiliVideo {
  pic: string;
  author: string;
  title: string;
  description?: string;
  created: number;
  bvid: string;
}

// Feed项目类型
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

// 读取bilibili用户配置
function getBiliUsers(): BiliUser[] {
  try {
    const configPath = path.join(process.cwd(), 'config', 'bili-users.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    return config.filter((user: BiliUser) => user.enabled);
  } catch (error) {
    console.error('Failed to read bili-users config:', error);
    return [];
  }
}

// 获取B站用户最新视频
async function getBiliUserVideos(uid: number): Promise<BiliVideo[]> {
  try {
    const response = await fetch(`https://api.bilibili.com/x/space/arc/search?mid=${uid}&ps=3&tid=0&pn=1&keyword=&order=pubdate&jsonp=jsonp`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': `https://space.bilibili.com/${uid}/video`,
      }
    });
    const data = await response.json();
    
    // 检查API响应状态
    if (data.code !== 0) {
      console.log(`Bilibili API error for user ${uid}: ${data.message} (code: ${data.code})`);
      return [];
    }
    
    return data.data?.list?.vlist || [];
  } catch (error) {
    console.error('Failed to get bili user videos:', error);
    return [];
  }
}

export const revalidate = 600; // Revalidate every 10 minutes

export async function GET() {
  try {
    const users = getBiliUsers();
    const allItems: FeedItem[] = [];

    // 顺序处理每个用户，避免并发请求导致限流
    for (const user of users) {
      try {
        const videos = await getBiliUserVideos(user.uid);
        
        if (videos.length === 0) {
          // 没有视频时显示占位内容
          allItems.push({
            source: `Bilibili - ${user.name}`,
            avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff&size=48`,
            author: user.name,
            title: `暂无视频 - ${user.name}`,
            summary: `${user.name} 还没有发布视频`,
            timestamp: new Date().toISOString(),
            url: `https://space.bilibili.com/${user.uid}/video`,
          });
        } else {
          // 转换视频数据为FeedItem格式
          const userItems = videos.map((video: BiliVideo) => ({
            source: `Bilibili - ${user.name}`,
            avatar: video.pic.startsWith('http') ? video.pic : `https:${video.pic}`,
            author: video.author,
            title: video.title,
            summary: video.description || `${user.name} 发布的视频`,
            timestamp: new Date(video.created * 1000).toISOString(),
            url: `https://www.bilibili.com/video/${video.bvid}`,
          }));
          allItems.push(...userItems);
        }

        // 添加更长延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
        
      } catch (error) {
        console.error(`Failed to fetch videos for user ${user.name} (${user.uid}):`, error);
        // 出错时也添加占位内容
        allItems.push({
          source: `Bilibili - ${user.name}`,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff&size=48`,
          author: user.name,
          title: `连接中 - ${user.name}`,
          summary: `正在连接 ${user.name} 的视频源...`,
          timestamp: new Date().toISOString(),
          url: `https://space.bilibili.com/${user.uid}/video`,
        });
      }
    }

    // 按时间排序
    allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(allItems);
  } catch (error) {
    console.error('Failed to fetch Bilibili feeds:', error);
    // 返回空数组而不是错误对象，确保前端能正常处理
    return NextResponse.json([]);
  }
}