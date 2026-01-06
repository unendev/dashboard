# 🎮 小黑盒爬虫 - 快速启动指南

> **状态**: ✅ MCP测试已验证，可直接使用

## 📋 前置条件检查清单

- [ ] Python 3.10+ 已安装
- [ ] Node.js 18+ 已安装（前端）
- [ ] PostgreSQL 数据库已就绪
- [ ] 已获取小黑盒 Token ID
- [ ] 已获取 DeepSeek API Key

---

## 🚀 快速启动（3步）

### 第1步：配置环境变量

在项目根目录的 `.env` 文件中添加：

```env
# 小黑盒Token（必填）
HEYBOX_TOKEN_ID=你的token_id

# DeepSeek AI（必填）
DEEPSEEK_API_KEY=你的api_key

# 数据库（应该已有）
DATABASE_URL=你的数据库连接

# 可选配置
HEYBOX_POST_LIMIT=20
HEYBOX_COMMENT_LIMIT=50
```

**获取Token方法**：
1. 浏览器登录 https://www.xiaoheihe.cn
2. F12 → Network → 刷新页面
3. 任意请求 → Request Headers → 复制 `x-xhh-tokenid`

### 第2步：安装依赖 + 数据库迁移

```bash
# Python依赖
cd linuxdo-scraper
pip install playwright playwright-stealth asyncpg python-dotenv requests

# 安装Playwright浏览器
python -m playwright install chromium

# 数据库迁移
cd ..
npx prisma migrate dev --name add_heybox_tables
```

### 第3步：测试运行

```bash
# Windows
run-heybox-scraper.bat

# Linux/Mac
cd linuxdo-scraper/heybox_scraper
python heybox_playwright_scraper.py
```

---

## ✅ 验证运行结果

### 检查日志
```bash
# 查看爬虫日志
cat linuxdo-scraper/heybox_scraper/logs/heybox_scraper.log

# 成功标志
✓ Token认证成功
✓ 爬取到 20 篇帖子
✓ AI分析完成
✓ 数据已存入数据库
```

### 检查数据库
```bash
npx prisma studio
# 查看 heybox_posts 和 heybox_comments 表
```

### 检查前端
```bash
npm run dev
# 访问 http://localhost:3000
# 顶部应该有 "🎮 小黑盒" 按钮
```

---

## 🔧 常见问题

### Q1: Token失效怎么办？
**症状**: 出现滑块验证或401错误  
**解决**: 重新登录小黑盒，获取新的Token ID

### Q2: 数据库连接失败？
**症状**: `P1001: Can't reach database server`  
**解决**: 
```bash
# 检查DATABASE_URL是否正确
echo $DATABASE_URL

# 测试连接
npx prisma db pull
```

### Q3: Playwright浏览器没安装？
**症状**: `Executable doesn't exist at ...`  
**解决**:
```bash
python -m playwright install chromium
```

### Q4: 前端看不到小黑盒数据？
**解决步骤**:
1. 检查数据库有数据: `npx prisma studio`
2. 检查API: 访问 `http://localhost:3000/api/heybox`
3. 检查日期: 试试选择不同日期
4. 清除缓存，刷新页面

---

## 🤖 自动化部署

### 方式A: GitHub Actions（推荐）

已配置每天凌晨自动运行，需要在GitHub仓库设置Secrets：

```
Settings → Secrets and variables → Actions → New repository secret
```

添加以下3个secrets：
- `HEYBOX_TOKEN_ID`
- `DEEPSEEK_API_KEY`
- `DATABASE_URL`

手动触发测试：
```
Actions → 小黑盒爬虫定时任务 → Run workflow
```

### 方式B: Windows任务计划程序

1. 打开"任务计划程序"
2. 创建基本任务
3. 触发器: 每天凌晨0点
4. 操作: 启动程序
   - 程序: `D:\Study\Vue-\个人门户\project-nexus\run-heybox-scraper.bat`
   - 起始于: `D:\Study\Vue-\个人门户\project-nexus`

---

## 📊 数据结构说明

### heybox_posts 表
- `id`: 帖子唯一标识
- `title`: 标题
- `url`: 链接
- `author`: 作者
- `cover_image`: 封面图
- `likes_count`: 点赞数
- `comments_count`: 评论数
- `game_tag`: 游戏标签
- `core_issue`: AI提取的核心问题
- `post_type`: 帖子类型（游戏资讯/攻略等）
- `value_assessment`: 价值评估（高/中/低）

### heybox_comments 表
- `id`: 评论唯一标识
- `post_id`: 所属帖子ID
- `content`: 评论内容
- `author`: 评论者
- `likes_count`: 点赞数
- `parent_id`: 父评论ID（用于楼层关系）

---

## 🎯 下一步优化

- [ ] Token自动刷新机制
- [ ] 评论在前端显示
- [ ] 游戏标签筛选功能
- [ ] 帖子趋势分析
- [ ] 多账号轮换

---

## 📞 技术支持

- 查看详细文档: `linuxdo-scraper/heybox_scraper/README.md`
- MCP测试报告: `linuxdo-scraper/heybox_scraper/MCP_TEST_REPORT.md`
- 安装指南: `linuxdo-scraper/heybox_scraper/INSTALLATION_GUIDE.md`

---

**🎉 现在可以开始使用了！**

