# LinuxDo 评论抓取功能测试指南

## 测试前准备

### 1. 确认环境
```bash
cd linuxdo-scraper/linuxdo
python --version  # 确认Python 3.8+
```

### 2. 检查依赖
```bash
pip list | grep playwright
pip list | grep asyncpg
```

如果缺少，安装：
```bash
pip install -r requirements.txt
playwright install chromium
```

### 3. 确认环境变量
检查 `.env` 文件包含：
- `DEEPSEEK_API_KEY`
- `DATABASE_URL`
- `PROXY_URL`（如需要）

---

## 测试步骤

### 测试1：运行优化版爬虫

```bash
cd linuxdo-scraper/linuxdo
python scripts/scraper_optimized.py
```

**预期输出**：
```
🚀 开始爬取Linux.do帖子...
✓ 获取到 30 篇帖子（仅RSS描述）

============================================================
🔍 开始抓取帖子详情页（真实评论）
============================================================

[1/30] 处理: xxx...
  ⏳ 访问帖子: xxx...
    ✓ 找到 5 个帖子（1楼主 + 4评论）
    ✓ 成功提取 4 条评论
[2/30] 处理: xxx...
...

✅ 完成帖子详情抓取
   总帖子数: 30
   总评论数: 120
```

**关键检查点**：
- ✅ 能访问帖子详情页
- ✅ 显示"找到X个帖子"
- ✅ 显示"成功提取X条评论"
- ✅ 总评论数 > 0

---

### 测试2：检查AI分析包含评论

查看日志中的AI分析输入：

**应该包含**：
```
**评论区讨论** (4条真实评论)：
1. [用户名] (👍5): 评论内容...
2. [用户名] (👍3): 评论内容...
...
```

**不应该是**：
```
（暂无评论）
```

---

### 测试3：验证生成的报告

查看生成的 `../data/linux.do_report_YYYY-MM-DD.json`

**检查结构**：
```json
{
  "posts": [
    {
      "id": "xxx",
      "title": "xxx",
      "analysis": {
        "detailed_analysis": "## 💬 社区风向（基于4条真实评论）..."
      }
    }
  ]
}
```

**关键验证**：
1. ✅ `detailed_analysis` 包含"社区风向（基于X条真实评论）"
2. ✅ 有具体的评论观点引用
3. ✅ 不是"可能引发的讨论"这种推测性语言

---

### 测试4：数据库验证

```bash
# 进入Python REPL
python

>>> from prisma import PrismaClient
>>> import asyncio
>>> 
>>> async def check():
...     prisma = PrismaClient()
...     await prisma.connect()
...     
...     # 查询最新帖子
...     posts = await prisma.posts.findMany(
...         orderBy={'timestamp': 'desc'},
...         take=1
...     )
...     
...     if posts:
...         post = posts[0]
...         print(f"标题: {post.title}")
...         print(f"详细分析长度: {len(post.detailed_analysis or '')}")
...         print(f"是否包含'真实评论': {'真实评论' in (post.detailed_analysis or '')}")
...     
...     await prisma.disconnect()
... 
>>> asyncio.run(check())
```

**预期输出**：
```
标题: xxx
详细分析长度: 800+
是否包含'真实评论': True
```

---

## 常见问题

### Q1: 无法访问帖子详情页
**错误**：`未找到帖子容器`

**解决**：
- 检查网络连接
- 确认代理设置
- 尝试访问 https://linux.do 确认可达

### Q2: 总评论数为0
**可能原因**：
- 选择器可能过时
- 帖子确实没有评论
- 页面加载不完整

**调试**：
修改 `scripts/scraper_optimized.py`：
```python
# 在 fetch_post_replies 函数中添加
await asyncio.sleep(5)  # 延长等待时间
html = await page.content()
print(html[:1000])  # 打印HTML检查结构
```

### Q3: AI分析仍然是推测性的
**检查**：
1. 确认爬虫日志显示"成功提取X条评论"
2. 检查传给AI的prompt是否包含评论
3. 查看AI响应是否真的在分析评论

---

## 性能基准

| 指标 | 预期值 |
|------|--------|
| 30个帖子抓取时间 | 60-90秒 |
| 平均评论数/帖子 | 3-8条 |
| AI分析长度 | 600-1000字 |
| 错误率 | < 10% |

---

## 回滚方法

如果出现问题，临时禁用评论抓取：

```python
# 在 scraper_optimized.py 中注释掉
# posts_with_replies = await fetch_posts_with_replies(page, posts_with_content)
# return posts_with_replies

# 恢复原来的
return posts_with_content
```

---

## 下一步优化

测试通过后可以考虑：
1. 并发抓取（asyncio.gather）提升速度
2. 评论缓存避免重复抓取
3. 智能评论筛选（质量评分）
4. 情感分析增强

---

**测试人**：_______  
**测试日期**：_______  
**测试结果**：✅ / ❌








