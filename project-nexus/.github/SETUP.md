# GitHub Actions 配置指南

## 🔐 配置Secrets

在使用Reddit爬虫之前，你需要在GitHub仓库中配置以下Secrets。

### 步骤1: 进入Secrets设置页面

1. 打开你的GitHub仓库
2. 点击顶部的 `Settings` (设置)
3. 在左侧边栏找到 `Secrets and variables` > `Actions`
4. 点击右上角的 `New repository secret` 按钮

### 步骤2: 添加必需的Secrets

#### 1. DEEPSEEK_API_KEY

**用途**: AI分析和中文翻译

**获取方式**:
1. 访问 https://platform.deepseek.com/
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的API Key

**格式**:
```
Name: DEEPSEEK_API_KEY
Value: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2. DATABASE_URL

**用途**: 存储爬取的Reddit数据

**格式** (Neon PostgreSQL):
```
Name: DATABASE_URL
Value: postgresql://username:password@ep-xxx-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

**获取方式**:
1. 访问 https://neon.tech/
2. 创建免费账号
3. 创建新的数据库项目
4. 在项目Dashboard中复制Connection String

### 步骤3: 验证配置

添加完Secrets后，你可以：

1. 进入 `Actions` 标签
2. 选择 `Reddit多板块爬虫` workflow
3. 点击右上角的 `Run workflow`
4. 选择 `master` 分支
5. 点击绿色的 `Run workflow` 按钮

如果配置正确，workflow将成功执行并生成报告。

## ⚙️ 自定义配置

### 修改执行时间

编辑 `.github/workflows/reddit-scraper.yml`:

```yaml
on:
  schedule:
    - cron: '0 11 * * *'  # 当前: 每天UTC 11:00 (北京时间19:00)
```

**常用时间示例**:
- `0 0 * * *` - 每天UTC 00:00 (北京时间08:00)
- `0 6 * * *` - 每天UTC 06:00 (北京时间14:00)
- `0 12 * * *` - 每天UTC 12:00 (北京时间20:00)
- `0 */6 * * *` - 每6小时执行一次

### 修改爬取的板块

编辑 `linuxdo-scraper/reddit_scraper/reddit_scraper_multi.py`:

```python
SUBREDDITS = [
    "technology",    # 科技
    "gamedev",       # 独立游戏开发
    "godot",         # Godot引擎
    "Unity3D",       # Unity引擎
    "unrealengine",  # 虚幻引擎
    # 添加更多你感兴趣的板块:
    # "programming",
    # "webdev",
    # "learnprogramming",
]
```

## 📊 查看执行结果

### 方式1: GitHub Actions日志

1. 进入 `Actions` 标签
2. 点击最新的workflow运行
3. 展开任务步骤查看详细日志

### 方式2: 下载Artifacts

每次执行后，生成的报告会作为Artifacts保存：

1. 进入workflow运行详情页
2. 滚动到底部的 `Artifacts` 区域
3. 下载 `reddit-reports-xxx` 压缩包
4. 解压后可查看JSON和Markdown报告

### 方式3: 数据库查询

数据已自动存入你的Neon数据库，可以：

- 使用Neon的SQL Editor查询
- 通过项目前端API `/api/reddit` 访问
- 使用任何PostgreSQL客户端连接查询

## 🐛 常见问题

### Q: Workflow执行失败，提示"DEEPSEEK_API_KEY未找到"

**A**: 检查Secret名称是否完全一致（区分大小写），确保是`DEEPSEEK_API_KEY`而不是`DEEPSEEK_API_KEY `（注意空格）

### Q: 数据库连接失败

**A**: 
1. 确认DATABASE_URL格式正确
2. 检查Neon项目是否处于活跃状态
3. 确认连接字符串包含`?sslmode=require`

### Q: AI分析结果不是中文

**A**: 
1. 确认使用的是`reddit_scraper_multi.py`而不是旧版`reddit_scraper.py`
2. 检查AI提示词是否被正确加载
3. 查看执行日志确认DeepSeek API调用成功

### Q: 爬取的帖子数量不对

**A**: Reddit RSS源有时会限流或返回较少帖子，这是正常现象。可以：
- 等待一段时间后重试
- 适当增加`POST_COUNT_PER_SUB`的值

### Q: GitHub Actions执行时间过长

**A**: 
- 25个帖子约需2-3分钟（每个帖子间隔3秒）
- 如果超过10分钟，检查网络连接和API响应
- 可以减少`POST_COUNT_PER_SUB`或`SUBREDDITS`数量

## 💰 成本估算

### DeepSeek API费用

- **价格**: ¥0.001 元/千tokens
- **每个帖子**: 约500-800 tokens
- **每日成本**: 25个帖子 × 0.0005元 ≈ ¥0.0125元
- **月度成本**: 约 ¥0.38元

### Neon数据库

- **免费额度**: 0.5GB存储 + 191小时计算时间/月
- **Reddit数据**: 每月约1-2MB
- **结论**: 完全在免费额度内

### GitHub Actions

- **免费额度**: 2000分钟/月（公开仓库无限制）
- **每次执行**: 约3分钟
- **结论**: 完全免费

**总计**: 每月成本约 ¥0.4元 🎉

## 📞 技术支持

如果遇到问题：

1. 查看 [README.md](../../linuxdo-scraper/reddit_scraper/README.md)
2. 检查GitHub Actions执行日志
3. 在仓库提交Issue

## ✅ 配置检查清单

- [ ] 已添加 DEEPSEEK_API_KEY secret
- [ ] 已添加 DATABASE_URL secret
- [ ] 已测试手动触发workflow
- [ ] workflow执行成功
- [ ] 数据库中有数据
- [ ] 可以通过API访问数据
- [ ] 定时任务正常运行

完成所有步骤后，你的Reddit爬虫就配置完成了！🎉


