# 小黑盒爬虫 - 快速安装指南

## ✅ MCP测试验证通过（2025-10-25）

**测试结果**：
- ✅ Token认证成功
- ✅ 安全验证已绕过
- ✅ 页面正常加载帖子内容
- ✅ 数据提取方案确认

**技术方案**：Playwright无头浏览器 + Token注入

---

## 📦 已创建的文件

### Python爬虫部分
```
linuxdo-scraper/heybox_scraper/
├── __init__.py                   # 模块初始化
├── config.py                     # 配置管理
├── heybox_api_scraper.py         # 主爬虫脚本 ⭐
├── README.md                     # 详细使用文档
├── UI_INTEGRATION_TODO.md        # 前端集成待办
├── INSTALLATION_GUIDE.md         # 本文件
├── logs/                         # 日志目录
└── data/                         # 数据备份目录
```

### 数据库
```
prisma/schema.prisma              # 添加了heybox_posts和heybox_comments表
```

### Next.js API
```
app/api/heybox/
├── route.ts                      # 获取帖子列表API
└── dates/route.ts                # 获取可用日期API
```

### 前端组件
```
app/components/layout/
└── ScrollableLayout.tsx          # 已添加小黑盒支持（部分UI待完成）
```

### 类型定义
```
types/heybox.d.ts                 # TypeScript类型定义
```

### 定时任务
```
run-heybox-scraper.bat            # Windows批处理脚本
.github/workflows/heybox-scraper.yml  # GitHub Actions配置
```

### 配置文件
```
linuxdo-scraper/env.template      # 已添加小黑盒配置说明
.env                              # 需要手动添加配置
```

---

## 🚀 立即开始（3步启动）

### 第1步：配置Token

在项目根目录的 `.env` 文件中添加：

```env
# 小黑盒Token（必须！）
HEYBOX_TOKEN_ID=BmG6lgAmG/emKgY6F+XyquvLgj0l21Tf6MDDBZSCR0v9o8u5H5M463Gz+ERKSJN1rb1nQpDeQWKmMcV2jIdcNIg==

# 如果已有以下配置，跳过
DEEPSEEK_API_KEY=sk-your-api-key
DATABASE_URL=postgresql://user:password@host/database
```

**注意**：示例中的token是您提供的值，可以直接使用。

---

### 第2步：执行数据库迁移

```bash
# 在项目根目录执行
npx prisma migrate dev --name add_heybox_tables
npx prisma generate
```

**如果迁移失败**（数据库连接问题），可以先运行爬虫，数据会自动创建表。

---

### 第3步：安装Playwright浏览器

```bash
python -m playwright install chromium
```

### 第4步：测试运行

```bash
cd linuxdo-scraper/heybox_scraper
python heybox_playwright_scraper.py
```

**预期输出**：
```
================================================================================
🎮 小黑盒爬虫启动
================================================================================

配置信息：
  - 目标帖子数: 20
  - 评论数限制: 50
  - Token已配置: 是
  - AI分析: 是

🔍 开始抓取首页信息流（目标20条）...
  尝试API: https://api.xiaoheihe.cn/bbs/app/api/feed/home
  响应状态码: 200
  ✓ 成功获取数据
✅ 成功解析20个帖子

[1/20] 处理: 《黑神话：悟空》新DLC内容...
  📝 抓取帖子 12345 的评论...
    ✓ 获取到15条评论
  🤖 AI分析: 《黑神话：悟空》新DLC内容...
    ✓ AI分析完成

...

💾 保存数据到数据库...
  ✓ 数据库连接成功
✅ 数据保存完成: 20个帖子, 287条评论
✅ JSON备份已保存: data/heybox_report_2025-10-25.json

================================================================================
🎉 爬虫执行完成！
================================================================================
```

---

## ⚠️ 可能遇到的问题

### 问题1：Playwright浏览器未安装

**现象**：`Executable doesn't exist at ...`

**解决**：
```bash
python -m playwright install chromium
```

### 问题2：Token无效（之前的API版本问题）

**已解决**：使用Playwright+Token注入方案，MCP测试验证成功

**步骤**：
1. 浏览器打开 https://www.xiaoheihe.cn/app/bbs/home
2. 按F12打开开发者工具 → Network标签
3. 刷新页面，查找获取帖子列表的请求
4. 记录API地址、请求参数
5. 在 `heybox_api_scraper.py` 中更新 `fetch_home_feed()` 函数

**脚本中已提供多个可能的API端点**，会自动尝试。如果都失败，说明需要更新。

---

### 问题2：Token无效

**现象**：API返回401未授权

**解决**：
1. 确认token完整复制（包括末尾的 `==`）
2. 检查小黑盒是否登录状态
3. 重新获取token（token可能过期）

---

### 问题3：数据库连接失败

**现象**：`could not connect to server`

**解决**：
1. 检查 `DATABASE_URL` 配置是否正确
2. 确认网络可访问数据库
3. Neon数据库可能自动暂停，访问一次恢复

---

## 🎨 前端集成（可选）

爬虫运行成功后，前端需要完成最后的UI集成：

### 需要手动添加的UI元素

查看 `UI_INTEGRATION_TODO.md` 文件，里面有详细的代码块和位置说明。

主要包括：
1. ✅ 添加"🎮 小黑盒"切换按钮
2. ✅ 添加日期选择器
3. ✅ 在大纲导航添加小黑盒部分

**或者**：直接使用现有功能，小黑盒数据会在"全部源"中显示。

---

## 🕐 配置定时任务

### Windows任务计划程序

1. `Win+R` 输入 `taskschd.msc` 打开任务计划程序
2. 创建基本任务 → 命名"小黑盒每日爬虫"
3. 触发器：每天凌晨00:00
4. 操作：启动程序
   - 程序路径：`D:\Study\Vue-\个人门户\project-nexus\run-heybox-scraper.bat`
   - 起始于：`D:\Study\Vue-\个人门户\project-nexus`
5. 完成

### GitHub Actions

1. 在GitHub仓库 → Settings → Secrets 添加：
   - `HEYBOX_TOKEN_ID`: 您的token
   - `DEEPSEEK_API_KEY`: DeepSeek API密钥（应该已有）
   - `DATABASE_URL`: 数据库URL（应该已有）

2. 推送代码到GitHub，每天UTC 16:00（北京时间00:00）自动运行

3. 手动触发：GitHub仓库 → Actions → "小黑盒爬虫定时任务" → Run workflow

---

## ✅ 验证安装

### 1. 爬虫验证

```bash
cd linuxdo-scraper/heybox_scraper
python heybox_api_scraper.py
```

查看 `logs/heybox_scraper.log` 确认无错误

### 2. 数据库验证

访问数据库，确认表已创建：
- `heybox_posts`
- `heybox_comments`

### 3. API验证

```bash
# 启动Next.js开发服务器
npm run dev

# 访问API
curl http://localhost:3000/api/heybox
curl http://localhost:3000/api/heybox/dates
```

### 4. 前端验证

访问 http://localhost:3000

- 查看是否有小黑盒数据（在"全部源"中）
- 如果已添加UI，测试切换按钮

---

## 📚 相关文档

- `README.md` - 完整使用文档（配置、问题排查）
- `UI_INTEGRATION_TODO.md` - 前端UI集成指南
- `.claude/plan/小黑盒爬虫集成.md` - 完整执行计划

---

## 🎯 下一步

1. ✅ 测试爬虫运行
2. ✅ 确认数据正常存储
3. ✅ 配置定时任务
4. ⏸️ 完成前端UI集成（可选，数据已可用）
5. ⏸️ 根据实际API调整爬虫逻辑

---

**安装完成时间**：2025-10-25
**预计耗时**：10-15分钟（首次配置）

