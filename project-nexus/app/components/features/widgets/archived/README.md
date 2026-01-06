# Widget 组件归档说明

## 归档时间
2025-10-04

## 归档原因
首页功能改造，专注于核心情报源（Linux.do 和 Reddit）。这些组件暂时不需要，但完整保留以便未来恢复使用。

## 归档组件列表

### 1. BilibiliCard.tsx
- **功能**: 展示 B站 关注用户的动态信息
- **API 端点**: `/api/bilibili-feeds`
- **依赖**: useSWR, Card, Avatar 组件
- **状态**: 已归档 ✓

### 2. EternalReturnCard.tsx
- **功能**: 展示 Eternal Return 游戏最新战绩
- **API 端点**: `/api/eternal-return`
- **依赖**: lucide-react 图标库
- **特性**: 完整的游戏数据展示（排名、K/D/A、装备、特质等）
- **状态**: 已归档 ✓

### 3. RuanYiFengCard.tsx
- **功能**: 展示阮一峰科技周刊
- **API 端点**: `/api/ruanyifeng-feeds`
- **依赖**: useSWR
- **状态**: 已归档 ✓

### 4. SpotifyCard.tsx
- **功能**: 展示 Spotify 音乐播放信息（卡片组件）
- **依赖**: 被 MusicWidget 使用
- **状态**: 已归档 ✓

### 5. TwitterCard.tsx
- **功能**: 展示 Twitter 用户推文
- **API 端点**: `/api/twitter` (POST)
- **依赖**: Next Image, 复杂的推文数据处理
- **特性**: 支持用户搜索、图片展示、交互数据
- **状态**: 待完整归档

### 6. TwitterDebug.tsx
- **功能**: Twitter 功能调试组件
- **状态**: 待完整归档

### 7. TwitterStatusCheck.tsx
- **功能**: Twitter 状态检查组件
- **状态**: 待完整归档

### 8. TwitterStyleCard.tsx
- **功能**: Twitter 样式卡片变体
- **状态**: 待完整归档

### 9. YouTubeLikedCard.tsx
- **功能**: 展示 YouTube 我喜欢的视频
- **API 端点**: `/api/youtube/real-liked`, `/api/youtube/liked-public`
- **依赖**: NextAuth, YouTubeAuthCard
- **特性**: 支持认证和公开缓存回退
- **状态**: 待完整归档

### 10. YouTubeAuthCard.tsx
- **功能**: YouTube OAuth 认证组件
- **依赖**: next-auth
- **状态**: 待完整归档

### 11. YouTubeCard.tsx
- **功能**: YouTube 基础卡片组件
- **API 端点**: `/api/youtube/liked`
- **状态**: 待完整归档

### 12. YouTubePlaylistCard.tsx
- **功能**: YouTube 播放列表卡片
- **状态**: 待完整归档

### 13. RedditCard.tsx
- **功能**: Reddit 卡片组件（可能的变体）
- **状态**: 待确认是否归档

### 14. MusicWidget (位于 app/components/shared/)
- **功能**: 音乐播放器 Widget
- **API 端点**: `/api/music/spotify`
- **依赖**: SpotifyCard, useSWR
- **特性**: 实时播放状态、缓存回退
- **状态**: 待归档

## 相关 API 端点

| 端点 | 用途 | 归档状态 |
|------|------|----------|
| `/api/bilibili-feeds` | B站动态 | 保留 |
| `/api/eternal-return` | 游戏战绩 | 保留 |
| `/api/ruanyifeng-feeds` | 阮一峰周刊 | 保留 |
| `/api/twitter` | Twitter推文 | 保留 |
| `/api/youtube/liked` | YouTube喜欢 | 保留 |
| `/api/youtube/real-liked` | YouTube实时喜欢 | 保留 |
| `/api/youtube/liked-public` | YouTube公开缓存 | 保留 |
| `/api/music/spotify` | Spotify音乐 | 保留 |

## 恢复使用步骤

### 方法一：恢复单个组件

1. 从 `archived/` 目录复制所需组件回 `app/components/features/widgets/`
2. 在 `IntelligenceHub.tsx` 或其他页面中引入组件
3. 确认相关 API 端点仍然可用
4. 测试组件功能

示例：
```typescript
import BilibiliCard from '@/app/components/features/widgets/BilibiliCard'

// 在布局中使用
<BilibiliCard />
```

### 方法二：批量恢复
如果需要恢复原有的多功能首页布局：

1. 复制所有归档组件回原目录
2. 参考 `ScrollableLayout.tsx` 的历史版本（Git commit）
3. 重新配置 `infoSources` 数组
4. 测试所有组件

## 相关配置文件

- `config/bili-users.json` - B站用户配置
- 环境变量（见 `docs/环境变量配置.md`）:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `TWITTER_API_KEY`
  - `YOUTUBE_API_KEY`
  - `ETERNAL_RETURN_API_KEY`

## 依赖说明

所有归档组件使用的依赖包仍保留在项目中：
- `useSWR` - 数据获取
- `next-auth` - 认证
- `lucide-react` - 图标
- `@radix-ui/*` - UI组件

## 注意事项

1. **API 密钥**: 某些组件需要第三方 API 密钥才能正常工作
2. **OAuth 认证**: YouTube 和 Spotify 组件需要 OAuth 认证流程
3. **缓存机制**: 大部分组件都实现了缓存回退机制
4. **样式兼容**: 组件使用玻璃态设计，确保与页面主题兼容

## 维护建议

- 定期检查 API 端点是否仍然有效
- 关注第三方服务的 API 变更
- 保持依赖包的更新
- 文档与代码保持同步

## 历史记录

- 2025-10-04: 初次归档，首页改造为情报中心
- 保留所有功能代码，便于未来恢复或参考

---

如有任何问题，请参考项目主文档或联系开发团队。


