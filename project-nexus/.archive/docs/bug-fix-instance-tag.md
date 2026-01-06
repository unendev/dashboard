# Bug 修复：使用事物项标签后计时卡片创建失败

## 问题描述

在 `/log` 页面的"创建新事物"功能中，当使用事物项标签后，计时卡片会创建失败。

## 问题根源

### 1. 数据库约束问题（主要原因）

**问题：** 在 `prisma/schema.prisma` 中，`InstanceTag` 模型的 `name` 字段设置了全局唯一约束 `@unique`：

```prisma
model InstanceTag {
  name String @unique  // ❌ 问题：全局唯一
  userId String
  ...
}
```

这导致当不同用户使用相同的标签名（如 `#学习`）时，第二个用户创建时会因为违反唯一性约束而失败，进而导致整个任务创建事务失败。

**修复：** 将单字段唯一约束改为复合唯一约束，允许不同用户使用相同的标签名：

```prisma
model InstanceTag {
  name String         // ✅ 移除 @unique
  userId String
  ...
  @@unique([name, userId])  // ✅ 改为复合唯一约束
}
```

### 2. 字符串处理问题（次要原因）

**问题：** 在分割标签字符串时，如果标签之间有空格（如 `"#学习, #工作"`），会导致标签名包含多余的空格。

**修复：** 在前端和后端都添加了数据清理逻辑：
- 对每个标签执行 `trim()` 去除首尾空格
- 使用 `filter()` 过滤掉空字符串

## 修改的文件

### 1. `prisma/schema.prisma`
- 将 `InstanceTag.name` 的 `@unique` 改为 `@@unique([name, userId])`

### 2. `prisma/migrations/fix_instance_tag_unique_constraint/migration.sql`
- 新增迁移文件，用于修改数据库约束

### 3. `app/log/page.tsx`
- 修改 `handleAddToTimer` 函数
- 在分割标签时添加 `.map(tag => tag.trim()).filter(tag => tag)`

### 4. `app/api/timer-tasks/route.ts`
- 在 API 层添加标签数组清理逻辑
- 确保即使前端没有清理，后端也能正确处理

## 如何应用修复

### 1. 数据库迁移（重要！）

当数据库连接可用时，运行以下命令应用数据库迁移：

```bash
npx prisma migrate deploy
```

或者如果是开发环境：

```bash
npx prisma migrate dev
```

### 2. 重启应用

修改完成后重启 Next.js 应用：

```bash
npm run dev
```

## 验证修复

1. 打开 `/log` 页面
2. 点击"创建新事物"
3. 选择一个分类和任务
4. 在"事物项标签"中选择或创建标签（如 `#学习`）
5. 提交表单
6. 验证计时卡片是否成功创建

## 技术说明

### 为什么需要复合唯一约束？

在多用户系统中，每个用户应该能够创建自己的标签集合，即使标签名相同。例如：
- 用户 A 可以有 `#学习` 标签
- 用户 B 也可以有 `#学习` 标签
- 这两个标签是独立的，互不影响

使用 `@@unique([name, userId])` 确保：
- 同一用户不能创建重复的标签名（避免冗余）
- 不同用户可以使用相同的标签名（保证独立性）

### 事务处理

`lib/timer-db.ts` 中的 `addTask` 函数使用了 Prisma 事务：
```typescript
await prisma.$transaction(async (tx) => {
  // 创建任务
  // 创建或查找标签
  // 创建任务-标签关联
})
```

当任何一步失败时（如违反唯一性约束），整个事务会回滚，导致任务创建失败。这就是为什么修复数据库约束如此重要。

## 日期

2025-10-04

