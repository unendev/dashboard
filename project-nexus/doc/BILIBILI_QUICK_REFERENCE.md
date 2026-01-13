# Bilibili API 快速参考

## 快速开始

### 1. 获取用户信息
```typescript
import { getUserInfo } from '@/lib/bilibili-service';

const userInfo = await getUserInfo(123456); // mid
console.log(userInfo.name, userInfo.level);
```

### 2. 获取用户动态
```typescript
import { getUserDynamics } from '@/lib/bilibili-service';

const dynamics = await getUserDynamics(
  123456,  // uid
  '0',     // offset
  30       // limit
);
```

### 3. 获取视频详情
```typescript
import { getVideoDetail } from '@/lib/bilibili-service';

const video = await getVideoDetail('BV1MU411S7iJ');
console.log(video.title, video.stat.view);
```

### 4. 获取收藏夹
```typescript
import { getUserFavorites, getFavoriteContent } from '@/lib/bilibili-service';

// 获取收藏夹列表
const favorites = await getUserFavorites(123456);

// 获取收藏夹内容
const items = await getFavoriteContent(123456);
```

### 5. 获取关注列表
```typescript
import { getUserFollowings } from '@/lib/bilibili-service';

const followings = await getUserFollowings(123456, 50, 1);
```

## API 端点速查表

| 功能 | 端点 | 方法 | 认证 |
|------|------|------|------|
| 获取视频详情 | `/x/web-interface/view` | GET | 可选 |
| 获取视频统计 | `/x/web-interface/archive/stat` | GET | 否 |
| 获取推荐视频 | `/x/web-interface/wbi/index/top/feed/rcmd` | GET | 可选 |
| 获取用户信息 | `/x/space/acc/info` | GET | 否 |
| 获取用户动态 | `/dynamic_svr/v1/dynamic_svr/space_history` | GET | 是 |
| 获取收藏夹列表 | `/x/v3/fav/folder` | GET | 是 |
| 获取收藏夹内容 | `/x/v3/fav/resource` | GET | 是 |
| 获取收藏详情 | `/x/v3/fav/resource/infos` | GET | 否 |
| 获取关注列表 | `/x/relation/followings` | GET | 是 |
| 获取粉丝列表 | `/x/relation/followers` | GET | 是 |
| 获取动态草稿 | `/dynamic_draft/v1/dynamic_draft/get_drafts` | GET | 是 |
| 获取消息设置 | `/link_setting/v1/link_setting/get` | GET | 是 |
| 获取私信媒体 | `/x/im/feed/infoweb` | GET | 是 |
| 获取播放器信息 | `/x/player/wbi/v2` 或 `/x/player/v2` | GET | 可选 |

## 常用参数

### 视频类型 (type)
```
2  - 视频
12 - 音频
21 - 番剧
```

### 动态类型 (dynamic_type)
```
1  - 纯文字动态
2  - 图文动态
4  - 视频动态
8  - 音频动态
16 - 转发动态
32 - 文章动态
64 - 直播动态
```

### 用户关系 (attribute)
```
0 - 未关注
1 - 已关注
2 - 互相关注
3 - 被关注
4 - 黑名单
5 - 被拉黑
```

### 排序方式 (order)
```
desc - 降序（默认）
asc  - 升序
```

### 收藏排序 (order)
```
mtime - 按修改时间排序（默认）
view  - 按播放量排序
```

## 错误处理

### 常见错误码
```
0      - 成功
-101   - 未登录
-400   - 请求错误
-403   - 无权限
-404   - 资源不存在
-500   - 服务器错误
700009 - 权限不足
```

### 错误处理示例
```typescript
try {
  const userInfo = await getUserInfo(123456);
} catch (error) {
  if (error.message.includes('-101')) {
    console.log('需要登录');
  } else if (error.message.includes('-404')) {
    console.log('用户不存在');
  } else {
    console.error('未知错误:', error);
  }
}
```

## 认证方式

### 使用 Cookie 认证
```typescript
const auth = {
  sessdata: 'your_sessdata_here',
  csrf_token: 'your_csrf_token_here',
  csrf: 'your_csrf_here'
};

const userInfo = await getUserInfo(123456);
// 某些 API 需要传入 auth 参数
const dynamics = await getUserDynamics(123456, '0', 30, auth);
```

### 获取 Cookie
1. 打开 https://www.bilibili.com
2. 登录账号
3. 打开浏览器开发者工具 (F12)
4. 进入 Application → Cookies
5. 复制 `SESSDATA` 值

## 数据解析

### 解析动态卡片
```typescript
import { parseDynamicCard } from '@/lib/bilibili-service';

const dynamics = await getUserDynamics(123456);
dynamics.cards.forEach(card => {
  const cardData = parseDynamicCard(card.card);
  console.log(cardData);
});
```

### 解析用户资料
```typescript
import { parseUserProfile } from '@/lib/bilibili-service';

const profile = parseUserProfile(userProfileJson);
console.log(profile);
```

## 批量操作

### 批量获取收藏详情
```typescript
import { getFavoriteResourceInfos } from '@/lib/bilibili-service';

const resources = [
  '583785685:2',  // 视频
  '15664:12',     // 音频
];

const infos = await getFavoriteResourceInfos(resources);
```

### 批量获取私信媒体
```typescript
import { getPrivateMessageMediaInfo } from '@/lib/bilibili-service';

const mediaInfo = await getPrivateMessageMediaInfo(
  [1906473802, 1906473803],  // aids
  undefined,                  // epIds
  undefined,                  // articleIds
  auth
);
```

## 分页处理

### 获取所有关注
```typescript
async function getAllFollowings(vmid: number, auth: BilibiliAuth) {
  const allFollowings = [];
  let pn = 1;
  
  while (true) {
    const result = await getUserFollowings(vmid, 50, pn, 'desc', auth);
    
    if (!result.list || result.list.length === 0) {
      break;
    }
    
    allFollowings.push(...result.list);
    pn++;
  }
  
  return allFollowings;
}
```

### 获取所有动态
```typescript
async function getAllDynamics(uid: number, auth: BilibiliAuth) {
  const allDynamics = [];
  let offset = '0';
  
  while (true) {
    const result = await getUserDynamics(uid, offset, 30, auth);
    
    if (!result.cards || result.cards.length === 0) {
      break;
    }
    
    allDynamics.push(...result.cards);
    offset = result.offset;
  }
  
  return allDynamics;
}
```

## 缓存策略

### 推荐的 TTL 值
```
用户信息: 1 小时
视频详情: 1 小时
动态列表: 30 分钟
收藏夹: 2 小时
关注列表: 4 小时
推荐视频: 15 分钟
```

### 缓存键命名规范
```
bilibili:user:{mid}
bilibili:video:{bvid}
bilibili:dynamic:{uid}:{offset}
bilibili:collection:{fid}
bilibili:following:{vmid}:{pn}
```

## 性能优化

### 1. 使用缓存
```typescript
// 检查缓存
const cached = await cache.get(`bilibili:user:${mid}`);
if (cached) return cached;

// 获取数据
const data = await getUserInfo(mid);

// 存储缓存
await cache.set(`bilibili:user:${mid}`, data, 3600);
```

### 2. 批量请求
```typescript
// 不好：逐个请求
for (const aid of aids) {
  await getVideoDetail(aid);
}

// 好：批量请求
const infos = await getFavoriteResourceInfos(
  aids.map(aid => `${aid}:2`)
);
```

### 3. 并发控制
```typescript
// 使用 Promise.all 但限制并发数
async function batchRequests(items: any[], fn: Function, limit: number) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}
```

## 常见问题

### Q: 如何处理 Cookie 过期？
A: 实现 Cookie 有效性检查，当收到 -101 错误时提示用户重新登录。

### Q: 如何避免速率限制？
A: 实现请求队列，添加延迟，使用缓存减少请求数。

### Q: 如何获取完整的动态内容？
A: 动态内容存储在 `card` 字段中，需要使用 `parseDynamicCard()` 解析。

### Q: 支持哪些排序方式？
A: 不同 API 支持不同的排序方式，详见 API 文档。

### Q: 如何处理大量数据？
A: 使用分页、缓存、批量操作和数据库存储。

## 调试技巧

### 1. 启用详细日志
```typescript
// 在 bilibili-service.ts 中添加
console.log(`[Bilibili API] ${method} ${endpoint}`);
console.log(`[Bilibili API] Response:`, data);
```

### 2. 使用 curl 测试
```bash
curl -G 'https://api.bilibili.com/x/space/acc/info' \
  --data-urlencode 'mid=123456'
```

### 3. 检查响应格式
```typescript
const response = await fetch(url);
const data = await response.json();
console.log(JSON.stringify(data, null, 2));
```

## 相关文档

- [完整 API 指南](./BILIBILI_API_GUIDE.md)
- [数据库模型](./BILIBILI_SCHEMA.md)
- [实现计划](./BILIBILI_IMPLEMENTATION_PLAN.md)
- [Bilibili API 收集](https://github.com/socialsisteryi/bilibili-api-collect)

---

**提示**: 这是一份快速参考指南，详细信息请查看完整文档。
