# Bilibili API 个人信息源集成指南

## 概述

本文档详细记录了 Bilibili API 接口，用于在 Project Nexus 中实现个人信息源功能。通过这些 API，可以获取用户的视频、动态、收藏等内容。

## 认证方式

### Cookie 认证
大多数 Bilibili API 需要通过 Cookie 中的 `SESSDATA` 进行认证。

```bash
curl -G 'https://api.bilibili.com/x/web-interface/view' \
  --data-urlencode 'bvid=BV1MU411S7iJ' \
  -b 'SESSDATA=your_sessdata_here'
```

### CSRF Token
某些 POST 请求需要 CSRF Token，通常从 Cookie 中获取。

## 核心 API 接口

### 1. 获取视频详情

**端点**: `GET https://api.bilibili.com/x/web-interface/view`

**认证**: Cookie (SESSDATA)

**请求参数**:
- `aid` (number, 可选): 视频 AID
- `bvid` (string, 可选): 视频 BVID（与 aid 互斥）

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "bvid": "BV1MU411S7iJ",
    "aid": 1906473802,
    "videos": 1,
    "tid": 17,
    "tname": "单机游戏",
    "copyright": 1,
    "title": "视频标题",
    "pubdate": 1715946937,
    "ctime": 1715946937,
    "desc": "视频描述",
    "duration": 882,
    "owner": {
      "mid": 374484802,
      "name": "UP主昵称",
      "face": "https://i1.hdslb.com/bfs/face/..."
    },
    "stat": {
      "aid": 1906473802,
      "view": 48250,
      "danmaku": 433,
      "reply": 123,
      "favorite": 456,
      "coin": 789,
      "share": 100,
      "like": 2959
    }
  }
}
```

### 2. 获取推荐视频列表

**端点**: `GET https://api.bilibili.com/x/web-interface/wbi/index/top/feed/rcmd`

**认证**: 无需认证（但推荐带上 Cookie 获得个性化推荐）

**请求参数**:
- `fresh_type` (int): 刷新类型，例如 4
- `ps` (int): 每页数量，例如 12
- `fresh_idx` (int): 刷新索引，例如 5
- `fetch_row` (int): 获取行数，例如 16

**响应数据结构**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "item": [
      {
        "id": 1354614895,
        "bvid": "BV1Dz42117GZ",
        "cid": 1548835687,
        "title": "视频标题",
        "duration": 882,
        "pubdate": 1715946937,
        "pic": "http://i1.hdslb.com/bfs/archive/...",
        "owner": {
          "mid": 374484802,
          "name": "UP主昵称",
          "face": "https://i1.hdslb.com/bfs/face/..."
        },
        "stat": {
          "view": 48250,
          "like": 2959,
          "danmaku": 433
        },
        "rcmd_reason": {
          "reason_type": 0
        }
      }
    ]
  }
}
```

### 3. 获取视频播放器信息

**端点**: `GET https://api.bilibili.com/x/player/wbi/v2` (未登录) 或 `GET https://api.bilibili.com/x/player/v2` (已登录)

**认证**: Cookie (SESSDATA) - 仅登录版本需要

**请求参数**:
- `bvid` (string): 视频 BVID
- `aid` (number): 视频 AID
- `cid` (number): 视频分P ID

**关键响应字段**:
```json
{
  "code": 0,
  "data": {
    "aid": 1906473802,
    "bvid": "BV1MU411S7iJ",
    "cid": 1625992822,
    "login_mid": 616368979,
    "is_owner": false,
    "vip": {
      "type": 1,
      "status": 0,
      "due_date": 1665417600000
    },
    "level_info": {
      "current_level": 3,
      "current_exp": 2962
    }
  }
}
```

### 4. 获取视频统计信息

**端点**: `GET https://api.bilibili.com/x/web-interface/archive/stat`

**认证**: 无需认证

**请求参数**:
- `aid` (number): 视频 AID

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "aid": 91572143,
    "view": 2236510,
    "danmaku": 37856,
    "reply": 5723,
    "favorite": 131317,
    "coin": 143389,
    "share": 44598,
    "like": 264314
  }
}
```

### 5. 获取用户动态

**端点**: `GET https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history`

**认证**: Cookie (SESSDATA)

**请求参数**:
- `host_uid` (number): 用户 UID
- `offset` (string): 分页偏移量
- `limit` (number): 每页数量，默认 30

**响应结构**:
```json
{
  "code": 0,
  "message": "0",
  "data": {
    "cards": [
      {
        "desc": {
          "uid": 123456,
          "type": 1,
          "rid": 987654,
          "oid": 987654,
          "ctime": 1715946937,
          "dynamic_id": "123456789"
        },
        "card": "{...}" // JSON 字符串，需要解析
      }
    ],
    "offset": "next_offset_value"
  }
}
```

### 6. 获取用户收藏夹列表

**端点**: `GET https://api.bilibili.com/x/v3/fav/folder`

**认证**: Cookie (SESSDATA)

**请求参数**:
- `up_mid` (number): 用户 UID
- `ps` (number): 每页数量，默认 20
- `pn` (number): 页码，默认 1

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "count": 5,
    "list": [
      {
        "id": 123456,
        "fid": 123456,
        "mid": 987654,
        "attr": 0,
        "title": "收藏夹名称",
        "cover": "http://i0.hdslb.com/bfs/...",
        "media_count": 42,
        "intro": "收藏夹描述",
        "ctime": 1715946937,
        "mtime": 1715946937,
        "state": 0,
        "like_count": 0,
        "fav_state": 0
      }
    ]
  }
}
```

### 7. 获取收藏夹内容

**端点**: `GET https://api.bilibili.com/x/v3/fav/resource`

**认证**: Cookie (SESSDATA)

**请求参数**:
- `media_id` (number): 收藏夹 ID
- `ps` (number): 每页数量，默认 20
- `pn` (number): 页码，默认 1
- `order` (string): 排序方式，'mtime' 或 'view'

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "info": {
      "id": 123456,
      "fid": 123456,
      "mid": 987654,
      "title": "收藏夹名称",
      "media_count": 42
    },
    "medias": [
      {
        "id": 583785685,
        "type": 2,
        "title": "视频标题",
        "cover": "http://i0.hdslb.com/bfs/archive/...",
        "intro": "视频描述",
        "page": 1,
        "duration": 604,
        "upper": {
          "mid": 293793435,
          "name": "UP主昵称",
          "face": "http://i0.hdslb.com/bfs/face/..."
        },
        "cnt_info": {
          "collect": 1470,
          "play": 28374,
          "danmaku": 64
        },
        "fav_time": 1715946937,
        "bvid": "BV1kz4y1X7XP"
      }
    ]
  }
}
```

### 8. 批量获取收藏内容详情

**端点**: `GET https://api.bilibili.com/x/v3/fav/resource/infos`

**认证**: 无需认证

**请求参数**:
- `resources` (string): 逗号分隔的资源列表，格式: `{content_id}:{content_type}`
  - 类型 2: 视频
  - 类型 12: 音频

**示例**:
```bash
curl -G 'https://api.bilibili.com/x/v3/fav/resource/infos' \
  --data-urlencode 'resources=583785685:2,15664:12'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": [
    {
      "id": 583785685,
      "type": 2,
      "title": "视频标题",
      "cover": "http://i0.hdslb.com/bfs/archive/...",
      "intro": "视频描述",
      "page": 1,
      "duration": 604,
      "upper": {
        "mid": 293793435,
        "name": "UP主昵称",
        "face": "http://i0.hdslb.com/bfs/face/..."
      },
      "attr": 0,
      "cnt_info": {
        "collect": 1470,
        "play": 28374,
        "danmaku": 64
      },
      "bvid": "BV1kz4y1X7XP",
      "pubtime": 1594049831
    }
  ]
}
```

### 9. 获取用户关注列表

**端点**: `GET https://api.bilibili.com/x/relation/followings`

**认证**: Cookie (SESSDATA)

**请求参数**:
- `vmid` (number): 用户 UID
- `ps` (number): 每页数量，默认 50
- `pn` (number): 页码，默认 1
- `order` (string): 排序方式，'desc' 或 'asc'

**响应结构**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "list": [
      {
        "mid": 123456,
        "attribute": 2,
        "mtime": 1715946937,
        "tag": [1, 2, 3],
        "special": 0,
        "contract_info": {},
        "uname": "UP主昵称",
        "face": "https://i1.hdslb.com/bfs/face/...",
        "sign": "个人签名",
        "official_verify": {
          "type": -1,
          "desc": ""
        },
        "vip": {
          "vipType": 0,
          "vipDueDate": 0,
          "dueRemark": "",
          "accessStatus": 0
        }
      }
    ],
    "total": 100
  }
}
```

### 10. 获取用户粉丝列表

**端点**: `GET https://api.bilibili.com/x/relation/followers`

**认证**: Cookie (SESSDATA)

**请求参数**:
- `vmid` (number): 用户 UID
- `ps` (number): 每页数量，默认 50
- `pn` (number): 页码，默认 1
- `order` (string): 排序方式，'desc' 或 'asc'

**响应结构**: 同关注列表

### 11. 获取用户基本信息

**端点**: `GET https://api.bilibili.com/x/space/acc/info`

**认证**: 无需认证（但推荐带上 Cookie）

**请求参数**:
- `mid` (number): 用户 UID

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "mid": 123456,
    "name": "用户昵称",
    "sex": "男",
    "face": "https://i1.hdslb.com/bfs/face/...",
    "face_nft": 0,
    "face_nft_new": 0,
    "is_face_nft": false,
    "sign": "个人签名",
    "rank": 20000,
    "level": 6,
    "jointime": 1234567890,
    "moral": 70,
    "silence": 0,
    "email_status": 1,
    "tel_status": 1,
    "identification": 1,
    "vip": {
      "type": 1,
      "status": 0,
      "due_date": 1715946937000,
      "vip_pay_type": 0,
      "theme_type": 0,
      "label": {
        "path": "",
        "text": "大会员",
        "label_theme": "vip"
      },
      "avatar_subscript": 1,
      "nickname_color": "#FB7299",
      "role": 3,
      "avatar_subscript_url": "https://i0.hdslb.com/bfs/vip/..."
    },
    "pendant": {
      "pid": 0,
      "name": "",
      "image": "",
      "expire": 0
    },
    "nameplate": {
      "nid": 0,
      "name": "",
      "image": "",
      "image_small": "",
      "level": "",
      "condition": ""
    },
    "official_verify": {
      "type": -1,
      "desc": ""
    },
    "live_room": null,
    "birthday": "01-01",
    "school_name": "",
    "profession": {
      "id": 0,
      "name": ""
    },
    "tags": null,
    "series": {
      "user_upgrade_status": 0,
      "show_upgrade_window": false
    },
    "is_senior_member": 0,
    "pc_settings": {
      "index_show_catch": 0
    },
    "profession_verify": 0,
    "realname_auth": 0,
    "realname_cert_url": "",
    "userReminder": {}
  }
}
```

### 12. 获取用户动态草稿

**端点**: `GET https://api.vc.bilibili.com/dynamic_draft/v1/dynamic_draft/get_drafts`

**认证**: Cookie (SESSDATA)

**请求参数**: 无

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "drafts": [
      {
        "draft_id": "123456789",
        "publish_time": 1715946937,
        "type": 1,
        "uid": 987654,
        "user_profile": {
          "info": {
            "uid": 987654,
            "uname": "用户昵称",
            "face": "https://i1.hdslb.com/bfs/face/..."
          }
        },
        "request": "{...}" // JSON 字符串，包含动态内容
      }
    ]
  }
}
```

### 13. 获取用户消息偏好设置

**端点**: `GET https://api.vc.bilibili.com/link_setting/v1/link_setting/get`

**认证**: Cookie (SESSDATA)

**请求参数**:
- `msg_notify` (number, 可选): 是否显示消息提醒设置
- `show_unfollowed_msg` (number, 可选): 是否显示未关注消息设置

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "show_unfollowed_msg": 0,
    "msg_notify": 1,
    "set_like": 0,
    "set_comment": 0,
    "set_at": 0,
    "is_group_fold": 0,
    "should_receive_group": 1,
    "receive_unfollow_msg": 0,
    "followed_reply": 0,
    "keys_reply": 0,
    "recv_reply": 0,
    "voyage_reply": 0,
    "recommend_followed_reply": 0,
    "ai_intercept": 0
  }
}
```

### 14. 获取私信中的多个媒体信息

**端点**: `GET https://api.vc.bilibili.com/x/im/feed/infoweb`

**认证**: Cookie (SESSDATA)

**请求参数**:
- `aids` (string, 可选): 逗号分隔的视频 AID 列表，最多 50 个
- `ep_ids` (string, 可选): 逗号分隔的番剧 EPID 列表，最多 50 个
- `article_ids` (string, 可选): 逗号分隔的文章 CV ID 列表
- `mobi_app` (string, 必需): 平台标识，例如 'web'

**响应示例**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "archive": [
      {
        "bvid": "BV1MU411S7iJ",
        "aid": 1906473802,
        "title": "视频标题",
        "pic": "http://i1.hdslb.com/bfs/archive/...",
        "duration": 882,
        "up_name": "UP主昵称",
        "view": 48250,
        "danmaku": 433,
        "status": 0
      }
    ],
    "article": [
      {
        "id": 123456,
        "title": "文章标题",
        "summary": "文章摘要",
        "up_name": "作者昵称",
        "image_urls": ["http://..."],
        "view_num": 1000,
        "like_num": 100,
        "reply_num": 50,
        "status": 0
      }
    ],
    "pgc": [
      {
        "ep_id": 123456,
        "cover": "http://...",
        "title": "《番剧名》 第 1 话 标题",
        "duration": 1440,
        "view": 50000,
        "danmaku": 1000,
        "url": "https://www.bilibili.com/bangumi/play/ep123456"
      }
    ]
  }
}
```

## 数据类型说明

### 视频类型 (type)
- `2`: 视频
- `12`: 音频
- `21`: 番剧

### 动态类型 (dynamic_type)
- `1`: 纯文字动态
- `2`: 图文动态
- `4`: 视频动态
- `8`: 音频动态
- `16`: 转发动态
- `32`: 文章动态
- `64`: 直播动态

### 用户关系状态 (attribute)
- `0`: 未关注
- `1`: 已关注
- `2`: 互相关注
- `3`: 被关注
- `4`: 黑名单
- `5`: 被拉黑

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| -101 | 未登录 |
| -400 | 请求错误 |
| -403 | 无权限 |
| -404 | 资源不存在 |
| -500 | 服务器错误 |
| 700009 | 权限不足 |

## 实现建议

### 1. 认证管理
```typescript
// 存储 SESSDATA 和 CSRF Token
interface BilibiliAuth {
  sessdata: string;
  csrf_token: string;
  csrf: string;
}
```

### 2. 请求封装
```typescript
// 创建通用的 API 请求函数
async function bilibiliRequest(
  endpoint: string,
  params?: Record<string, any>,
  auth?: BilibiliAuth
) {
  const url = new URL(endpoint);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0...'
  };
  
  if (auth?.sessdata) {
    headers['Cookie'] = `SESSDATA=${auth.sessdata}`;
  }
  
  const response = await fetch(url.toString(), { headers });
  return response.json();
}
```

### 3. 数据缓存
- 使用 Redis 或内存缓存存储 API 响应
- 设置合理的过期时间（视频信息 1 小时，动态 30 分钟）
- 实现增量更新机制

### 4. 错误处理
- 实现重试机制（指数退避）
- 处理速率限制（429 状态码）
- 记录详细的错误日志

### 5. 数据库模型
```prisma
model BilibiliVideo {
  id        String   @id
  bvid      String   @unique
  aid       Int      @unique
  title     String
  desc      String?
  duration  Int
  pubdate   DateTime
  cover     String?
  upMid     Int
  upName    String
  views     Int
  likes     Int
  danmaku   Int
  coins     Int
  favorites Int
  shares    Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model BilibiliDynamic {
  id        String   @id
  uid       Int
  type      Int
  content   String
  ctime     DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model BilibiliCollection {
  id        String   @id
  fid       Int
  mid       Int
  title     String
  cover     String?
  mediaCount Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 参考资源

- [Bilibili API 收集项目](https://github.com/socialsisteryi/bilibili-api-collect)
- [Bilibili API Python 库](https://github.com/nemo2011/bilibili-api)
- [Bilibili 官方文档](https://www.bilibili.com/)

## 注意事项

1. **速率限制**: Bilibili API 有速率限制，建议实现请求队列和缓存
2. **Cookie 过期**: SESSDATA 会过期，需要定期更新
3. **用户隐私**: 仅获取用户授权的数据
4. **条款遵守**: 遵守 Bilibili 服务条款和 API 使用规范
5. **数据安全**: 不要在代码中硬编码 Cookie，使用环境变量存储
