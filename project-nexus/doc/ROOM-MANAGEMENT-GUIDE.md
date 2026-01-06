# 房间管理指南

## 概述

项目提供了两种方式来管理和清理 Liveblocks 房间：

1. **Web 管理界面** - 通过 `/admin/rooms` 页面可视化管理
2. **命令行脚本** - 通过 `scripts/cleanup-liveblocks-rooms.mjs` 批量清理

## Web 管理界面

### 访问方式

打开浏览器访问：`http://localhost:3000/admin/rooms`

### 功能

#### 房间列表
- 显示所有已创建的房间
- 按创建时间倒序排列（最新的在前）
- 显示房间信息：
  - 房间 ID
  - 创建时间
  - 玩家数量
  - 最后活动时间

#### 房间详情
- 点击房间列表中的房间可查看详情
- 显示内容：
  - 字段笔记 (Field Notes)
  - 任务列表 (Tasks)
  - 玩家列表 (Players)
  - 元数据 (创建时间、最后活动时间)

#### 删除房间
- 将鼠标悬停在房间列表项上，会显示删除按钮（垃圾桶图标）
- 点击删除按钮会弹出确认对话框
- 确认后房间会从 Liveblocks 服务中删除
- 房间会从本地列表中移除

### 数据来源

- **房间列表**：从 `localStorage` 中的 `goc_rooms_metadata` 读取
- **房间详情**：从 `localStorage` 中的 `goc_room_{roomId}` 读取
- **删除操作**：调用 `/api/admin/rooms/delete` API 删除 Liveblocks 房间

## 命令行脚本

### 使用方式

```bash
node scripts/cleanup-liveblocks-rooms.mjs
```

### 功能

- 列出所有 Liveblocks 房间
- 自动识别测试房间（`test*`, `test-room-*`, 纯数字房间等）
- 批量删除测试房间
- 保留生产房间（如 `self-room-*`）

### 输出示例

```
🔍 Fetching all Liveblocks rooms...

Found 20 rooms total:

All rooms:
  🗑️ test-room-1
  🗑️ test-room-2
     self-room-1
     self-room-2

🗑️  Will delete 2 rooms:

  - test-room-1
  - test-room-2

🚀 Deleting rooms...

  ✅ Deleted: test-room-1
  ✅ Deleted: test-room-2

📊 Summary: 2 deleted, 0 failed
```

## API 端点

### DELETE /api/admin/rooms/delete

删除指定的 Liveblocks 房间。

**请求体：**
```json
{
  "roomId": "room-id-to-delete"
}
```

**成功响应 (200)：**
```json
{
  "success": true,
  "message": "Room room-id-to-delete deleted successfully"
}
```

**错误响应 (400/500)：**
```json
{
  "error": "Error message"
}
```

## 房间数据存储

### localStorage 结构

#### `goc_rooms_metadata`
存储所有房间的元数据列表：
```json
[
  {
    "id": "room-id",
    "createdAt": 1234567890,
    "playerCount": 2,
    "lastActivity": 1234567890
  }
]
```

#### `goc_room_{roomId}`
存储单个房间的详细数据：
```json
{
  "notes": "Field notes content",
  "todos": [
    {
      "id": "todo-id",
      "text": "Task description",
      "completed": false
    }
  ],
  "players": [
    {
      "id": "player-id",
      "name": "Player Name"
    }
  ],
  "createdAt": 1234567890,
  "lastActivity": 1234567890
}
```

## 注意事项

1. **权限**：删除房间需要有效的 Liveblocks Secret Key（存储在 `.env` 中）
2. **不可恢复**：删除房间后无法恢复，请谨慎操作
3. **本地数据**：删除房间时会同时清理 localStorage 中的相关数据
4. **生产环境**：建议在删除前备份重要数据

## 故障排除

### 删除失败

如果删除房间失败，检查以下内容：

1. **API Key 有效性**：确保 `.env` 中的 `LIVEBLOCKS_SECRET_KEY` 正确
2. **网络连接**：确保能访问 `api.liveblocks.io`
3. **房间存在**：确保房间在 Liveblocks 服务中存在

### 房间列表为空

如果管理界面显示房间列表为空，但 Liveblocks 中有房间：

1. 房间数据可能只存储在 Liveblocks 服务中，未同步到 localStorage
2. 使用命令行脚本查看所有房间
3. 访问房间后会自动在 localStorage 中创建元数据

## 最佳实践

1. **定期清理**：定期运行清理脚本移除测试房间
2. **备份重要数据**：在删除房间前导出重要数据
3. **监控房间数量**：使用管理界面监控房间数量增长
4. **命名规范**：为测试房间使用统一的命名前缀（如 `test-`）便于识别
