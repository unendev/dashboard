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

export const RSS_FEEDS: FeedConfig[] = [
    // --- Frontier (Tech/Dev) ---
    {
        key: 'linuxdo',
        name: 'Linux.do',
        url: 'https://linux.do/latest.rss',
        type: 'frontier',
        icon: '🐧',
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
        key: 'reddit_unity',
        name: 'Unity 3D',
        url: 'https://www.reddit.com/r/Unity3D/hot.json',
        type: 'frontier',
        icon: '🧊',
        enabled: false,
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
    {
        key: 'heybox',
        name: '小黑盒 Heybox',
        url: 'https://rsshub.app/heybox/news/2023',
        type: 'culture',
        icon: '📦',
        enabled: false
    },

    // --- Wool (Deals) ---
    {
        key: 'sspai',
        name: 'Sspai 少数派',
        url: 'https://sspai.com/feed',
        type: 'culture',
        icon: '⚡',
        enabled: true
    },


    // --- Bilibili (Handled via API, but config is here for UI toggles) ---
    {
        key: 'bilibili_dynamic',
        name: 'Bilibili',
        url: 'api_mode', // Marker to indicate this is not an RSS URL
        type: 'culture',
        icon: '📺',
        enabled: true
    }
];
