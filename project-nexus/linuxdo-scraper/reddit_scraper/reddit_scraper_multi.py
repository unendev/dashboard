# reddit_scraper_multi.py - 多Subreddit爬虫 + 中文翻译优化
import asyncio
import os
import re
import json
import logging
from datetime import datetime
import requests
from dotenv import load_dotenv
import xml.etree.ElementTree as ET
import time
import asyncpg
import ssl

# --- 配置日志 ---
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/reddit_scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- 配置 ---
load_dotenv()

# 支持多个subreddit
SUBREDDITS = [
    "technology",    # 科技
    "gamedev",       # 独立游戏开发
    "godot",         # Godot引擎
    "Unity3D",       # Unity引擎
    "unrealengine"   # 虚幻引擎
]

POST_COUNT_PER_SUB = 5  # 每个subreddit取5个帖子
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
NEON_DB_URL = os.getenv("DATABASE_URL")

# asyncpg不支持URL中的查询参数，需要清理
if NEON_DB_URL:
    original_url = NEON_DB_URL
    if '?' in NEON_DB_URL:
        NEON_DB_URL = NEON_DB_URL.split('?')[0]
        logger.info("已清理DATABASE_URL中的查询参数")
    
    # 详细日志：显示URL格式（隐藏密码）
    import re
    safe_url = re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', NEON_DB_URL)
    logger.info(f"DATABASE_URL格式: {safe_url}")
    
    # 解析URL各部分
    try:
        from urllib.parse import urlparse
        parsed = urlparse(NEON_DB_URL)
        logger.info(f"  - 协议: {parsed.scheme}")
        logger.info(f"  - 主机: {parsed.hostname}")
        logger.info(f"  - 端口: {parsed.port}")
        logger.info(f"  - 数据库: {parsed.path}")
        logger.info(f"  - 用户名: {parsed.username}")
    except Exception as e:
        logger.error(f"解析DATABASE_URL失败: {e}")
else:
    logger.error("DATABASE_URL 为空！")

# GitHub Actions环境检测（不使用代理）
IS_GITHUB_ACTIONS = os.getenv("GITHUB_ACTIONS") == "true"
if not IS_GITHUB_ACTIONS and os.path.exists(".env"):
    # 本地开发环境可以使用代理
    proxy_for_all = os.getenv("PROXY_URL", "")
    if proxy_for_all:
        os.environ['HTTP_PROXY'] = proxy_for_all
        os.environ['HTTPS_PROXY'] = proxy_for_all
        logger.info(f"使用代理: {proxy_for_all}")

# --- Reddit 爬虫函数 ---
def fetch_reddit_posts_from_subreddit(subreddit):
    """从单个Subreddit RSS获取帖子数据"""
    RSS_URL = f"https://www.reddit.com/r/{subreddit}/.rss?sort=hot"
    logger.info(f"  开始爬取 r/{subreddit}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    proxies = {}
    if not IS_GITHUB_ACTIONS and os.getenv("PROXY_URL"):
        proxy_url = os.getenv("PROXY_URL")
        proxies = {"http": proxy_url, "https": proxy_url}
    
    try:
        response = requests.get(RSS_URL, headers=headers, timeout=30, proxies=proxies)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        posts = []
        
        for i, entry in enumerate(root.findall('{http://www.w3.org/2005/Atom}entry')):
            if i >= POST_COUNT_PER_SUB:
                break
                
            title_tag = entry.find('{http://www.w3.org/2005/Atom}title')
            link_tag = entry.find('{http://www.w3.org/2005/Atom}link')
            content_tag = entry.find('{http://www.w3.org/2005/Atom}content')
            author_tag = entry.find('{http://www.w3.org/2005/Atom}author/{http://www.w3.org/2005/Atom}name')
            
            if title_tag is not None and link_tag is not None:
                title = title_tag.text
                link = link_tag.get('href')
                author = author_tag.text if author_tag is not None else "N/A"
                
                # 清理内容
                content_html = content_tag.text if content_tag is not None else ""
                clean_content = re.sub(r'<.*?>', ' ', content_html)
                clean_content = re.sub(r'\[link\]|\[comments\]', '', clean_content).strip()
                
                # 提取Reddit帖子ID
                post_id = "reddit_unknown"
                if '/comments/' in link:
                    parts = link.split('/comments/')
                    if len(parts) > 1:
                        id_part = parts[1].split('/')[0]
                        post_id = f"reddit_{subreddit}_{id_part}"
                
                posts.append({
                    "id": post_id,
                    "title": title,
                    "link": link,
                    "author": author,
                    "content": clean_content[:500] + '...' if len(clean_content) > 500 else clean_content,
                    "subreddit": subreddit,
                    "score": 0,
                    "num_comments": 0
                })
        
        logger.info(f"    ✓ r/{subreddit} 获取到 {len(posts)} 个帖子")
        return posts
        
    except requests.exceptions.RequestException as e:
        logger.error(f"    ✗ 请求 r/{subreddit} RSS失败: {e}")
        return []
    except ET.ParseError as e:
        logger.error(f"    ✗ 解析 r/{subreddit} XML失败: {e}")
        return []
    except Exception as e:
        logger.error(f"    ✗ 处理 r/{subreddit} 时发生错误: {e}")
        return []

def fetch_all_reddit_posts():
    """从所有配置的subreddit获取帖子"""
    logger.info("=== 开始爬取所有Subreddit ===")
    all_posts = []
    
    for subreddit in SUBREDDITS:
        posts = fetch_reddit_posts_from_subreddit(subreddit)
        all_posts.extend(posts)
        time.sleep(2)  # 避免请求过快
    
    logger.info(f"=== 总计获取 {len(all_posts)} 个帖子 ===")
    return all_posts

# --- AI分析函数 (优化中文输出 + 评论集成) ---
async def fetch_post_comments(post_id):
    """从数据库获取帖子的高质量评论"""
    try:
        conn = await asyncpg.connect(NEON_DB_URL)
        # 获取评分最高的前5条评论
        comments = await conn.fetch("""
            SELECT author, body, score 
            FROM reddit_comments 
            WHERE post_id = $1 
            ORDER BY score DESC 
            LIMIT 5
        """, post_id)
        await conn.close()
        return [dict(c) for c in comments]
    except:
        return []

async def analyze_single_post_with_deepseek(post, retry_count=0, comments=None):
    """使用Gemini分析Reddit帖子并输出完整中文（包含评论精华）"""
    excerpt = post.get('content', '')[:1000]
    if not excerpt.strip():
        excerpt = "（无详细内容）"
    
    # 构建评论摘要
    comment_section = ""
    if comments and len(comments) > 0:
        comment_section = "\n\n**社区讨论精华**（高赞评论）：\n"
        for i, comment in enumerate(comments[:3], 1):
            comment_body = comment['body'][:200]
            comment_section += f"{i}. [{comment['author']}] (👍{comment['score']}): {comment_body}...\n"
        logger.info(f"  ✓ 包含 {len(comments[:3])} 条评论到分析 Prompt")
    else:
        num_comments = post.get('num_comments', 0)
        if num_comments > 0:
            comment_section = f"\n\n**注意**：该帖子有 {num_comments} 条评论，但评论内容未包含在本次分析中。请仅基于帖子标题和正文内容进行分析，不要推测评论区内容。"
            logger.info(f"  ⚠ 帖子有 {num_comments} 条评论但未获取到内容")
        else:
            comment_section = ""
            logger.info(f"  ℹ 该帖子无评论")

    prompt = f"""
你是专业的Reddit技术内容分析专家。请分析以下帖子（含社区讨论），生成专业技术分析报告。

**原始帖子信息**：
- 标题: {post['title']}
- 板块: r/{post['subreddit']}
- 内容: {excerpt}{comment_section}

**请严格按JSON格式输出（不要包含```json```标记）**：
{{
  "title_cn": "中文标题翻译",
  "core_issue": "核心议题（一句话）",
  "key_info": ["关键信息1", "关键信息2", "关键信息3"],
  "post_type": "从[技术讨论, 新闻分享, 问题求助, 观点讨论, 资源分享, 教程指南, 项目展示, 其他]选一个",
  "value_assessment": "从[高, 中, 低]选一个",
  "detailed_analysis": "生成600-1200字专业技术分析，markdown格式，包含：技术背景、核心方案、工程实践、社区讨论、应用指南、技术趋势"
}}
"""
    
    # 调试：输出 Prompt 的关键部分（避免日志过长）
    logger.debug(f"  → Prompt 长度: {len(prompt)} 字符, 评论区长度: {len(comment_section)} 字符")
    
    try:
        # 使用 DeepSeek API (REST)
        def call_deepseek():
            response = requests.post(
                DEEPSEEK_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                },
                timeout=60,
            )
            
            if not response.ok:
                raise Exception(f"DeepSeek API error: {response.status_code}")
            
            return response.json()
        
        data = await asyncio.to_thread(call_deepseek)
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        
        # 清理JSON内容
        if content.startswith('```json'):
            content = content[7:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()
        
        try:
            analysis = json.loads(content)
            logger.info(f"  ✓ 帖子分析成功: {analysis.get('title_cn', 'N/A')[:30]}...")
            return analysis
        except json.JSONDecodeError:
            logger.error(f"  ✗ DeepSeek返回的内容不是有效JSON: {content[:100]}...")
            return {
                "title_cn": post['title'][:50] + "...",
                "core_issue": "JSON解析失败",
                "key_info": ["解析失败"],
                "post_type": "其他",
                "value_assessment": "低"
            }
            
    except Exception as e:
        logger.error(f"  ✗ AI分析失败: {e}")
        if retry_count < 2:
            logger.info(f"  ⟳ 重试AI分析 ({retry_count + 1}/2)...")
            await asyncio.sleep(2)
            return await analyze_single_post_with_deepseek(post, retry_count + 1, comments)
        else:
            return {
                "title_cn": post['title'][:50] + "...",
                "core_issue": "分析失败",
                "key_info": ["分析失败"],
                "post_type": "其他",
                "value_assessment": "低"
            }

# --- 数据库操作 ---
async def create_posts_table():
    """创建reddit帖子表"""
    if not NEON_DB_URL:
        logger.error("未找到 DATABASE_URL 环境变量")
        return False

    conn = None
    try:
        # Neon需要SSL连接
        logger.info(f"尝试连接数据库...")
        
        # 测试DNS解析
        try:
            from urllib.parse import urlparse
            import socket
            parsed = urlparse(NEON_DB_URL)
            host = parsed.hostname
            logger.info(f"  步骤1: 尝试DNS解析主机 {host}...")
            ip = socket.gethostbyname(host)
            logger.info(f"  ✓ DNS解析成功: {host} -> {ip}")
        except socket.gaierror as e:
            logger.error(f"  ✗ DNS解析失败: {e}")
            logger.error(f"  可能原因: 1)主机名错误 2)网络问题 3)DNS服务器问题")
            raise
        except Exception as e:
            logger.error(f"  ✗ DNS测试异常: {e}")
            raise
        
        logger.info(f"  步骤2: 配置SSL上下文...")
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        logger.info(f"  ✓ SSL配置完成")
        
        logger.info(f"  步骤3: 尝试建立数据库连接...")
        conn = await asyncpg.connect(
            dsn=NEON_DB_URL,
            ssl=ssl_context,
            timeout=60
        )
        logger.info("✓ 数据库连接成功")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS reddit_posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                title_cn TEXT,
                url TEXT NOT NULL,
                core_issue TEXT,
                key_info JSONB,
                post_type TEXT,
                value_assessment TEXT,
                subreddit TEXT,
                score INTEGER,
                num_comments INTEGER,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("✓ 数据库表 'reddit_posts' 检查完成")
        return True
    except Exception as e:
        logger.error(f"✗ 创建数据库表失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

async def insert_posts_into_db(posts_data):
    """将帖子数据插入到数据库"""
    if not NEON_DB_URL:
        logger.error("未找到 DATABASE_URL 环境变量")
        return False

    conn = None
    try:
        # Neon需要SSL连接
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        conn = await asyncpg.connect(
            dsn=NEON_DB_URL,
            ssl=ssl_context,
            timeout=60
        )
        logger.info("开始插入数据到数据库...")
        
        success_count = 0
        for post in posts_data:
            try:
                post_id = post.get('id')
                title = post.get('title')
                title_cn = post.get('analysis', {}).get('title_cn', title)
                url = post.get('link')
                analysis = post.get('analysis', {})
                core_issue = analysis.get('core_issue')
                key_info = json.dumps(analysis.get('key_info', []), ensure_ascii=False)
                post_type = analysis.get('post_type')
                value_assessment = analysis.get('value_assessment')
                detailed_analysis = analysis.get('detailed_analysis')
                subreddit = post.get('subreddit')
                score = post.get('score', 0)
                num_comments = post.get('num_comments', 0)

                await conn.execute("""
                    INSERT INTO reddit_posts (id, title, title_cn, url, core_issue, key_info, post_type, value_assessment, detailed_analysis, subreddit, score, num_comments)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        title_cn = EXCLUDED.title_cn,
                        url = EXCLUDED.url,
                        core_issue = EXCLUDED.core_issue,
                        key_info = EXCLUDED.key_info,
                        post_type = EXCLUDED.post_type,
                        value_assessment = EXCLUDED.value_assessment,
                        detailed_analysis = EXCLUDED.detailed_analysis,
                        subreddit = EXCLUDED.subreddit,
                        score = EXCLUDED.score,
                        num_comments = EXCLUDED.num_comments,
                        timestamp = CURRENT_TIMESTAMP;
                """, post_id, title, title_cn, url, core_issue, key_info, post_type, value_assessment, detailed_analysis, subreddit, score, num_comments)
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"  ✗ 插入帖子 {post.get('id', 'N/A')} 失败: {e}")
                continue
        
        logger.info(f"✓ 成功插入/更新 {success_count}/{len(posts_data)} 条数据")
        return success_count > 0
        
    except Exception as e:
        logger.error(f"✗ 数据库操作失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

# --- AI整体洞察报告 ---
async def generate_ai_summary_report(posts_data):
    """生成整体分析报告（异步版本，支持评论查询，使用DeepSeek）"""
    processed_posts = []
    post_summaries = []

    logger.info("=== 开始AI分析（包含评论）===")

    # 预先获取所有评论
    all_comments = []
    for post in posts_data:
        logger.info(f"→ 获取评论: r/{post['subreddit']} - {post['title'][:40]}...")
        comments = await fetch_post_comments(post.get('id'))
        if comments:
            logger.info(f"  ✓ 获取到 {len(comments)} 条高质量评论")
        all_comments.append(comments)

    # 并发分析所有帖子
    logger.info(f"=== 开始并发分析 {len(posts_data)} 个帖子 ===")
    tasks = [
        analyze_single_post_with_deepseek(post, comments=comments) 
        for post, comments in zip(posts_data, all_comments)
    ]
    analyses = await asyncio.gather(*tasks)

    logger.info("=== AI分析完成 ===")
    
    # 处理分析结果
    for i, analysis in enumerate(analyses):
        post = posts_data[i]
        if analysis and analysis.get("core_issue") not in ["分析失败", "JSON解析失败"]:
            processed_posts.append({
                "id": post.get('id'),
                "title": post.get('title'),
                "title_cn": analysis.get('title_cn', post.get('title')),
                "link": post.get('link'),
                "author": post.get('author'),
                "content": post.get('content'),
                "analysis": analysis,
                "subreddit": post.get('subreddit'),
                "score": post.get('score', 0),
                "num_comments": post.get('num_comments', 0)
            })
            
            post_summaries.append({
                "subreddit": post.get('subreddit'),
                "title_cn": analysis.get('title_cn', 'N/A'),
                "core_issue": analysis.get('core_issue', 'N/A'),
                "post_type": analysis.get('post_type', 'N/A'),
                "value_assessment": analysis.get('value_assessment')
            })
        else:
            logger.error(f"  ✗ 帖子分析失败: {post['title'][:30]}...")
    
    # 生成整体洞察（已移除 - 使用 DeepSeek 统一分析）
    logger.info("=== 跳过整体洞察报告生成 ===")
    summary_analysis = {
        "overview": f"今日共分析 {len(processed_posts)} 篇技术/游戏开发相关帖子。",
        "highlights": {"tech_news": [], "dev_insights": [], "hot_topics": []},
        "conclusion": "请查看各帖子详细分析。"
    }

    return {
        "summary_analysis": summary_analysis,
        "processed_posts": processed_posts
    }

# --- 报告生成 ---
def generate_json_report(report_data, posts_count):
    """生成JSON报告"""
    try:
        os.makedirs('data', exist_ok=True)
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"data/reddit_multi_report_{today_str}.json"

        final_json = {
            "meta": {
                "report_date": today_str,
                "title": f"Reddit技术+游戏开发每日报告 ({today_str})",
                "subreddits": SUBREDDITS,
                "post_count": posts_count,
                "generation_time": datetime.now().isoformat(),
                "status": "success" if posts_count > 0 else "no_data"
            },
            "summary": report_data.get('summary_analysis', {}),
            "posts": []
        }

        for post in report_data.get('processed_posts', []):
            final_json["posts"].append({
                "id": post.get('id', 'N/A'),
                "subreddit": post.get('subreddit'),
                "title": post.get('title', '无标题'),
                "title_cn": post.get('title_cn', '无标题'),
                "url": post.get('link', '#'),
                "analysis": post.get('analysis', {})
            })

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(final_json, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ JSON报告生成: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"✗ JSON报告生成失败: {e}")
        return None

def generate_markdown_report(report_data, posts_count):
    """生成Markdown报告"""
    try:
        os.makedirs('reports', exist_ok=True)
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"reports/Reddit_Multi_Daily_Report_{today_str}.md"

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# Reddit技术+游戏开发每日报告 ({today_str})\n\n")
            f.write(f"> 来源板块: {', '.join([f'r/{s}' for s in SUBREDDITS])}\n\n")
            
            f.write("---\n\n")
            f.write("## 🎯 今日热点洞察\n\n")
            
            summary = report_data.get('summary_analysis', {})
            if summary:
                f.write(f"**整体概况**: {summary.get('overview', '暂无')}\n\n")
                
                highlights = summary.get('highlights', {})
                if highlights.get('tech_news'):
                    f.write("**📰 技术新闻**:\n")
                    for item in highlights['tech_news']:
                        f.write(f"- {item}\n")
                    f.write("\n")
                
                if highlights.get('dev_insights'):
                    f.write("**🎮 开发见解**:\n")
                    for item in highlights['dev_insights']:
                        f.write(f"- {item}\n")
                    f.write("\n")
                
                if highlights.get('hot_topics'):
                    f.write("**🔥 热门话题**:\n")
                    for item in highlights['hot_topics']:
                        f.write(f"- {item}\n")
                    f.write("\n")
                
                f.write(f"**📝 小结**: {summary.get('conclusion', '暂无')}\n\n")
            
            f.write("---\n\n")
            f.write(f"## 📋 帖子列表 (共 {posts_count} 篇)\n\n")
            
            # 按subreddit分组
            posts = report_data.get('processed_posts', [])
            if posts:
                current_sub = None
                for i, post in enumerate(posts, 1):
                    subreddit = post.get('subreddit')
                    if subreddit != current_sub:
                        current_sub = subreddit
                        f.write(f"\n### r/{subreddit}\n\n")
                    
                    title_cn = post.get('title_cn', post.get('title', '无标题'))
                    link = post.get('link', '#')
                    analysis = post.get('analysis', {})
                    
                    f.write(f"{i}. **{title_cn}**\n")
                    f.write(f"   - 原标题: {post.get('title', 'N/A')}\n")
                    f.write(f"   - 链接: {link}\n")
                    f.write(f"   - 核心议题: {analysis.get('core_issue', 'N/A')}\n")
                    f.write(f"   - 类型: {analysis.get('post_type', 'N/A')} | 价值: {analysis.get('value_assessment', 'N/A')}\n\n")
            else:
                f.write("今日未能抓取到任何帖子。\n")

        logger.info(f"✓ Markdown报告生成: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"✗ Markdown报告生成失败: {e}")
        return None

# --- 主函数 ---
async def main():
    """主函数"""
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("🚀 Reddit多板块爬虫任务启动")
    logger.info(f"📋 目标板块: {', '.join(SUBREDDITS)}")
    logger.info(f"🌍 运行环境: {'GitHub Actions' if IS_GITHUB_ACTIONS else '本地环境'}")
    logger.info("=" * 60)
    
    try:
        # 验证环境变量
        if not DEEPSEEK_API_KEY:
            logger.error("❌ 未找到 DEEPSEEK_API_KEY 环境变量")
            return False
            
        if not NEON_DB_URL:
            logger.error("❌ 未找到 DATABASE_URL 环境变量")
            return False
        
        # 验证 DeepSeek API 配置
        logger.info("✓ DeepSeek API 配置已加载")
        
        # 创建数据库表
        if not await create_posts_table():
            logger.error("❌ 数据库表创建失败")
            return False
        
        # 获取所有帖子
        posts_data = fetch_all_reddit_posts()
        
        if not posts_data:
            logger.error("❌ 未能获取到任何帖子")
            return False
        
        logger.info(f"✓ 共获取 {len(posts_data)} 个帖子")
        
        # 生成AI报告（包含评论分析，使用DeepSeek）
        report_data = await generate_ai_summary_report(posts_data)
        
        # 插入数据库
        if report_data.get('processed_posts'):
            await insert_posts_into_db(report_data['processed_posts'])
        
        # 生成报告文件
        json_file = generate_json_report(report_data, len(posts_data))
        md_file = generate_markdown_report(report_data, len(posts_data))
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("=" * 60)
        logger.info("✅ 任务完成")
        logger.info(f"⏱️  用时: {duration:.2f} 秒")
        logger.info(f"📊 处理: {len(posts_data)} 个帖子")
        logger.info(f"📄 报告: {json_file}")
        logger.info(f"📄 报告: {md_file}")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 任务执行失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)

