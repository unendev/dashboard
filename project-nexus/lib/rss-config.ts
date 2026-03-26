// Shared config and types for RSS Feeds - Safe for Client & Server
export interface FeedItem {
    id?: string;
    title: string;
    link: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
    imageUrl?: string;
    source: string;
    sourceIcon?: string;
    author?: string;
    categories?: string[];
    isoDate?: string;
    summary?: string;
    metadata?: any;
}

export interface FeedConfig {
    key: string;
    name: string;
    url: string;
    type: 'frontier' | 'culture' | 'wool';
    icon?: string;
    enabled: boolean;
    parentId?: string;
    isParent?: boolean;
}

export const REDDIT_GAMEDEV_SUBREDDITS = [
    'unrealengine',
    'Unity3D',
    'godot',
    'gamedev',
    'indiegames',
    'gamedevjobs'
] as const;

export const RSS_FEEDS: FeedConfig[] = [
    // --- Frontier (Tech/Dev/News) ---
    {
        key: 'linuxdo',
        name: 'Linux.do',
        url: 'https://linux.do/latest.rss',
        type: 'frontier',
        icon: '🐧',
        enabled: true
    },
    {
        key: 'tech_weekly_ruanyifeng',
        name: '阮一峰的网络日志',
        url: 'http://www.ruanyifeng.com/blog/atom.xml',
        type: 'frontier',
        icon: '📖',
        enabled: true
    },
    {
        key: 'tech_weekly_hackernews',
        name: 'Hacker News',
        url: 'https://news.ycombinator.com/rss',
        type: 'frontier',
        icon: 'Y',
        enabled: true
    },

    // Reddit Parent Group
    {
        key: 'reddit_root',
        name: 'Reddit Network',
        url: '', // Virtual parent
        type: 'frontier',
        icon: '🔴',
        enabled: true,
        isParent: true
    },
    // Reddit Children
    {
        key: 'reddit_tech',
        name: 'Technology',
        url: 'https://www.reddit.com/r/technology/hot.json',
        type: 'frontier',
        icon: '💻',
        enabled: true,
        parentId: 'reddit_root'
    },
    {
        key: 'reddit_gamedev',
        name: 'Game Dev',
        url: 'https://www.reddit.com/r/gamedev/hot.json',
        type: 'frontier',
        icon: '👾',
        enabled: true,
        parentId: 'reddit_root'
    },
    {
        key: 'reddit_unrealengine',
        name: 'Unreal Engine',
        url: 'https://www.reddit.com/r/unrealengine/hot.json',
        type: 'frontier',
        icon: '🧩',
        enabled: true,
        parentId: 'reddit_root'
    },
    {
        key: 'reddit_unity3d',
        name: 'Unity3D',
        url: 'https://www.reddit.com/r/Unity3D/hot.json',
        type: 'frontier',
        icon: '🎯',
        enabled: true,
        parentId: 'reddit_root'
    },
    {
        key: 'reddit_godot',
        name: 'Godot',
        url: 'https://www.reddit.com/r/godot/hot.json',
        type: 'frontier',
        icon: '🤖',
        enabled: true,
        parentId: 'reddit_root'
    },
    {
        key: 'reddit_indiegames',
        name: 'Indie Games',
        url: 'https://www.reddit.com/r/indiegames/hot.json',
        type: 'frontier',
        icon: '🕹️',
        enabled: true,
        parentId: 'reddit_root'
    },
    {
        key: 'reddit_gamedevjobs',
        name: 'GameDev Jobs',
        url: 'https://www.reddit.com/r/gamedevjobs/hot.json',
        type: 'frontier',
        icon: '💼',
        enabled: true,
        parentId: 'reddit_root'
    },

    // --- Culture (Game/Art) ---
    {
        key: 'gcores',
        name: '机核 Gcores',
        url: 'https://www.gcores.com/rss',
        type: 'culture',
        icon: '🎮',
        enabled: true
    },

    // --- Wool (Social/Signals/Deals) ---
    {
        key: 'sspai',
        name: 'Sspai 少数派',
        url: 'https://sspai.com/feed',
        type: 'wool',
        icon: '⚡',
        enabled: true
    },
    // Duplicate sspai removed
];
