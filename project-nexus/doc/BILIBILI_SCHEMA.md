# Bilibili 数据库模型设计

## 概述

本文档定义了在 Project Nexus 中存储 Bilibili 个人信息源数据的数据库模型。

## Prisma Schema

将以下模型添加到 `prisma/schema.prisma` 中：

```prisma
// ============================================
// Bilibili 相关模型
// ============================================

/**
 * Bilibili 用户信息
 * 存储 Bilibili 用户的基本信息
 */
model BilibiliUser {
  id        String   @id @default(cuid())
  mid       Int      @unique
  name      String
  face      String?
  sign      String?
  level     Int      @default(0)
  sex       String?  @default("保密")
  jointime  DateTime?
  moral     Int      @default(0)
  
  // VIP 信息
  vipType   Int      @default(0)
  vipStatus Int      @default(0)
  vipDueDate DateTime?
  
  // 关系
  videos    BilibiliVideo[]
  dynamics  BilibiliDynamic[]
  collections BilibiliCollection[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([mid])
}

/**
 * Bilibili 视频
 * 存储 Bilibili 视频信息
 */
model BilibiliVideo {
  id        String   @id @default(cuid())
  bvid      String   @unique
  aid       Int      @unique
  title     String
  desc      String?  @db.Text
  duration  Int      @default(0)
  pubdate   DateTime
  cover     String?
  
  // UP 主信息
  upMid     Int
  upName    String
  upFace    String?
  
  // 统计信息
  views     Int      @default(0)
  likes     Int      @default(0)
  danmaku   Int      @default(0)
  coins     Int      @default(0)
  favorites Int      @default(0)
  shares    Int      @default(0)
  replies   Int      @default(0)
  
  // 分类
  tid       Int?
  tname     String?
  
  // 版权信息
  copyright Int      @default(1)
  
  // 关系
  user      BilibiliUser? @relation(fields: [userId], references: [id], onDelete: SetNull)
  userId    String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([upMid])
  @@index([pubdate])
  @@index([userId])
}

/**
 * Bilibili 动态
 * 存储用户发布的动态
 */
model BilibiliDynamic {
  id        String   @id @default(cuid())
  dynamicId String   @unique
  uid       Int
  type      Int      // 1: 纯文字, 2: 图文, 4: 视频, 8: 音频, 16: 转发, 32: 文章, 64: 直播
  content   String?  @db.Text
  
  // 关联内容
  rid       Int?     // 关联资源 ID
  oid       Int?     // 原始资源 ID
  
  // 统计信息
  likes     Int      @default(0)
  comments  Int      @default(0)
  shares    Int      @default(0)
  
  // 时间戳
  ctime     DateTime
  
  // 关系
  user      BilibiliUser? @relation(fields: [userId], references: [id], onDelete: SetNull)
  userId    String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([uid])
  @@index([ctime])
  @@index([userId])
}

/**
 * Bilibili 收藏夹
 * 存储用户的收藏夹信息
 */
model BilibiliCollection {
  id        String   @id @default(cuid())
  fid       Int      @unique
  mid       Int
  title     String
  cover     String?
  intro     String?  @db.Text
  mediaCount Int     @default(0)
  
  // 统计信息
  likeCount Int      @default(0)
  
  // 时间戳
  ctime     DateTime
  mtime     DateTime
  
  // 关系
  user      BilibiliUser? @relation(fields: [userId], references: [id], onDelete: SetNull)
  userId    String?
  items     BilibiliCollectionItem[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([mid])
  @@index([userId])
}

/**
 * Bilibili 收藏项目
 * 存储收藏夹中的项目
 */
model BilibiliCollectionItem {
  id        String   @id @default(cuid())
  resourceId Int
  resourceType Int   // 2: 视频, 12: 音频, 21: 番剧
  title     String
  cover     String?
  intro     String?  @db.Text
  duration  Int      @default(0)
  
  // UP 主信息
  upMid     Int?
  upName    String?
  upFace    String?
  
  // 统计信息
  views     Int      @default(0)
  danmaku   Int      @default(0)
  
  // 时间戳
  favTime   DateTime
  pubTime   DateTime?
  
  // 关系
  collection BilibiliCollection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  collectionId String
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([collectionId, resourceId, resourceType])
  @@index([collectionId])
}

/**
 * Bilibili 关注关系
 * 存储用户的关注信息
 */
model BilibiliFollowing {
  id        String   @id @default(cuid())
  mid       Int
  followMid Int
  
  // 用户信息
  name      String
  face      String?
  sign      String?
  
  // 关系状态
  attribute Int      @default(1) // 0: 未关注, 1: 已关注, 2: 互相关注
  
  // 标签
  tags      String?  // JSON 数组
  
  // 时间戳
  mtime     DateTime
  
  // 关系
  user      BilibiliUser? @relation(fields: [userId], references: [id], onDelete: SetNull)
  userId    String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([mid, followMid])
  @@index([mid])
  @@index([userId])
}

/**
 * Bilibili 粉丝关系
 * 存储用户的粉丝信息
 */
model BilibiliFollower {
  id        String   @id @default(cuid())
  mid       Int
  followerMid Int
  
  // 用户信息
  name      String
  face      String?
  sign      String?
  
  // 关系状态
  attribute Int      @default(3) // 3: 被关注
  
  // 时间戳
  mtime     DateTime
  
  // 关系
  user      BilibiliUser? @relation(fields: [userId], references: [id], onDelete: SetNull)
  userId    String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([mid, followerMid])
  @@index([mid])
  @@index([userId])
}

/**
 * Bilibili 认证信息
 * 存储用户的 Bilibili 认证凭证
 */
model BilibiliAuth {
  id        String   @id @default(cuid())
  userId    String   @unique
  mid       Int      @unique
  
  // 认证凭证
  sessdata  String   @db.Text
  csrfToken String   @db.Text
  csrf      String   @db.Text
  
  // 凭证状态
  isValid   Boolean  @default(true)
  expiresAt DateTime?
  
  // 关系
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
}

/**
 * Bilibili 同步任务
 * 记录数据同步的进度和状态
 */
model BilibiliSyncTask {
  id        String   @id @default(cuid())
  userId    String
  taskType  String   // 'videos', 'dynamics', 'collections', 'followings', 'followers'
  
  // 同步状态
  status    String   @default("pending") // pending, running, completed, failed
  progress  Int      @default(0)
  total     Int      @default(0)
  
  // 错误信息
  error     String?  @db.Text
  
  // 时间戳
  startedAt DateTime?
  completedAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
  @@index([status])
}
```

## 迁移步骤

1. 将上述模型添加到 `prisma/schema.prisma`
2. 运行迁移命令：
   ```bash
   npm run db:migrate:create -- --name add_bilibili_models
   ```
3. 审查生成的迁移文件
4. 应用迁移：
   ```bash
   npm run db:push
   ```

## 数据关系图

```
User (现有模型)
  ├── BilibiliAuth (1:1)
  │   └── 存储 Bilibili 认证凭证
  │
  └── BilibiliUser (1:1)
      ├── BilibiliVideo (1:N)
      │   └── 用户关注的视频
      ├── BilibiliDynamic (1:N)
      │   └── 用户发布的动态
      ├── BilibiliCollection (1:N)
      │   └── BilibiliCollectionItem (1:N)
      │       └── 收藏夹中的项目
      ├── BilibiliFollowing (1:N)
      │   └── 用户关注的人
      └── BilibiliFollower (1:N)
          └── 关注用户的人
```

## 查询示例

### 获取用户的所有视频
```typescript
const videos = await prisma.bilibiliVideo.findMany({
  where: {
    user: {
      mid: 123456
    }
  },
  orderBy: {
    pubdate: 'desc'
  }
});
```

### 获取用户的最新动态
```typescript
const dynamics = await prisma.bilibiliDynamic.findMany({
  where: {
    user: {
      mid: 123456
    }
  },
  orderBy: {
    ctime: 'desc'
  },
  take: 20
});
```

### 获取用户的收藏夹及其内容
```typescript
const collections = await prisma.bilibiliCollection.findMany({
  where: {
    mid: 123456
  },
  include: {
    items: {
      orderBy: {
        favTime: 'desc'
      }
    }
  }
});
```

### 获取用户的关注列表
```typescript
const followings = await prisma.bilibiliFollowing.findMany({
  where: {
    mid: 123456,
    attribute: 1
  },
  orderBy: {
    mtime: 'desc'
  }
});
```

## 性能优化建议

1. **索引优化**
   - 在 `mid`, `userId`, `pubdate`, `ctime` 等常用查询字段上创建索引
   - 考虑复合索引用于常见的多字段查询

2. **数据分区**
   - 对于大量数据，考虑按时间分区 `BilibiliVideo` 和 `BilibiliDynamic`

3. **缓存策略**
   - 使用 Redis 缓存热门数据（用户信息、最新动态）
   - 设置合理的过期时间

4. **批量操作**
   - 使用 `createMany` 进行批量插入
   - 使用 `updateMany` 进行批量更新

## 数据清理策略

1. **定期清理过期数据**
   ```typescript
   // 删除 30 天前的同步任务
   await prisma.bilibiliSyncTask.deleteMany({
     where: {
       completedAt: {
         lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
       }
     }
   });
   ```

2. **归档历史数据**
   - 考虑将旧数据移到归档表

3. **定期验证认证凭证**
   - 检查 `BilibiliAuth` 的有效性
   - 提示用户更新过期的凭证
