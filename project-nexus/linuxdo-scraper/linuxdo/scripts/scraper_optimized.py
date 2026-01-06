# scraper_optimized.py - 优化版Linux.do爬虫（本地PC运行版）
# 功能：爬取Linux.do论坛RSS，使用DeepSeek AI分析，存入Neon数据库
# 使用方法：
#   1. 确保已安装依赖: pip install drissionpage asyncpg requests python-dotenv
#   2. 确保已安装 Chrome（系统浏览器）
#   3. 配置 .env 文件（见下方配置说明）
#   4. 运行: python scraper_optimized.py

import asyncio
import os
import re
import json
import logging
from datetime import datetime
from DrissionPage import ChromiumPage, ChromiumOptions
from bs4 import BeautifulSoup
import requests
from dotenv import load_dotenv
import xml.etree.ElementTree as ET
import time
import asyncpg

# =============================================================================
# 配置区域 - 根据你的环境修改
# =============================================================================

# 加载环境变量（从项目根目录）
import pathlib
SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
SCRAPER_ROOT = SCRIPT_DIR.parents[2]
env_path = SCRAPER_ROOT / '.env'
load_dotenv(dotenv_path=env_path)

# 代理配置（如果不需要代理，设置为 None）
PROXY_URL = os.getenv("PROXY_URL", "http://127.0.0.1:10809")  # 默认代理地址
USE_PROXY = PROXY_URL and PROXY_URL.lower() != "none"  # 是否使用代理

# API配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 数据库配置
NEON_DB_URL = os.getenv("DATABASE_URL")

# 爬取配置
WARM_UP_URL = "https://linux.do/"
RSS_URL = "https://linux.do/latest.rss"
POST_COUNT_LIMIT = int(os.getenv("POST_COUNT_LIMIT", "30"))  # 爬取帖子数量

# 评论抓取配置
REQUEST_INTERVAL = 2  # 帖子间隔时间（秒）
PAGE_LOAD_WAIT = 2  # 页面加载等待时间（秒）
COMMENT_SUMMARY_LENGTH = 150  # 评论摘要长度
TOP_COMMENTS_LIMIT = 10  # 高赞评论数量限制

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 5

# AI请求间隔（避免触发速率限制）
AI_REQUEST_DELAY = 3

# 浏览器配置
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"  # 是否无头模式
CF_CHALLENGE_TIMEOUT = int(os.getenv("CF_CHALLENGE_TIMEOUT", "90"))
USER_DATA_DIR = os.getenv("USER_DATA_DIR")
PROFILE_DIRECTORY = os.getenv("PROFILE_DIRECTORY")
CHROME_PATH = os.getenv("CHROME_PATH")

# =============================================================================
# 日志配置
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# =============================================================================
# 启动检查
# =============================================================================

def user_data_enabled():
    return USER_DATA_DIR and USER_DATA_DIR.lower() != "none"

def check_environment():
    """检查运行环境是否配置正确"""
    logger.info("=" * 80)
    logger.info("Linux.do 爬虫 - 本地PC运行版")
    logger.info("=" * 80)
    
    issues = []
    
    # 检查代理配置
    if USE_PROXY:
        logger.info(f"✓ 代理模式: 启用 ({PROXY_URL})")
        os.environ['HTTP_PROXY'] = PROXY_URL
        os.environ['HTTPS_PROXY'] = PROXY_URL
    else:
        logger.info("✓ 代理模式: 禁用（直连）")
    
    # 检查API密钥
    if not DEEPSEEK_API_KEY:
        issues.append("❌ 未找到 DEEPSEEK_API_KEY 环境变量")
    else:
        logger.info(f"✓ DeepSeek API密钥: {DEEPSEEK_API_KEY[:8]}...")
    
    # 检查数据库URL
    if not NEON_DB_URL:
        issues.append("❌ 未找到 DATABASE_URL 环境变量")
    else:
        logger.info(f"✓ 数据库连接: 已配置")
    
    # 检查配置
    logger.info(f"✓ 爬取数量: {POST_COUNT_LIMIT} 篇帖子")
    logger.info(f"✓ 浏览器模式: {'无头' if HEADLESS else '有界面'}")
    logger.info(f"✓ AI请求间隔: {AI_REQUEST_DELAY} 秒")
    logger.info(f"✓ CF挑战等待: {CF_CHALLENGE_TIMEOUT} 秒")
    if CHROME_PATH:
        logger.info(f"✓ Chrome路径: {CHROME_PATH}")
    if user_data_enabled():
        logger.info(f"✓ 使用Chrome配置: {USER_DATA_DIR}")
        if PROFILE_DIRECTORY:
            logger.info(f"✓ Profile目录: {PROFILE_DIRECTORY}")
    logger.info("=" * 80)
    
    if issues:
        logger.error("\n配置问题：")
        for issue in issues:
            logger.error(issue)
        logger.error("\n请在 .env 文件中配置以下变量：")
        logger.error("  DEEPSEEK_API_KEY=your_api_key")
        logger.error("  DATABASE_URL=your_postgres_url")
        logger.error("  PROXY_URL=http://127.0.0.1:10809  # 可选，不用代理则设为 none")
        logger.error("  POST_COUNT_LIMIT=30  # 可选，默认30")
        return False
    
    return True

# =============================================================================
# Cloudflare 挑战处理
# =============================================================================

def get_page_html(page):
    try:
        return page.html
    except Exception:
        try:
            return page.html()
        except Exception:
            return ""

def wait_for_cloudflare_challenge(page, timeout=30):
    """
    等待 Cloudflare 挑战完成
    
    Args:
        page: DrissionPage 页面对象
        timeout: 最大等待时间（秒）
    """
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        # 检查是否存在 Cloudflare 挑战页面的特征
        try:
            # 检查页面标题是否包含 Cloudflare 相关内容
            try:
                title = page.title
            except Exception:
                title = ""
            
            # Cloudflare 挑战页面的常见标题
            cf_indicators = [
                "Just a moment",
                "Checking your browser",
                "Please wait",
                "Attention Required",
                "DDoS protection",
                "请稍候",
            ]

            is_cf_title = any(indicator.lower() in title.lower() for indicator in cf_indicators)
            html = get_page_html(page)
            is_cf_html = "challenge-platform" in html or "turnstile" in html
            is_cf_challenge = is_cf_title or is_cf_html
            
            if not is_cf_challenge:
                # 没有检测到 Cloudflare 挑战，可以继续
                return True
            
            logger.info(f"⏳ 检测到 Cloudflare 挑战，等待中... ({int(time.time() - start_time)}s)")
            time.sleep(2)
            
        except Exception as e:
            logger.warning(f"⚠️ 检查 Cloudflare 状态时出错: {e}")
            time.sleep(1)
    
    logger.warning(f"⚠️ Cloudflare 挑战等待超时 ({timeout}s)，继续执行...")
    return False

def _try_call(obj, names, *args, **kwargs):
    for name in names:
        if hasattr(obj, name):
            try:
                getattr(obj, name)(*args, **kwargs)
                return True
            except Exception:
                continue
    return False

def build_browser_page():
    options = ChromiumOptions()

    _try_call(options, ["auto_port"])

    if CHROME_PATH:
        set_ok = _try_call(options, ["set_browser_path"], CHROME_PATH)
        if not set_ok:
            set_ok = _try_call(options, ["set_paths"], browser_path=CHROME_PATH)
        if not set_ok:
            logger.warning("⚠️ 无法设置CHROME_PATH，使用默认Chrome路径")

    if user_data_enabled():
        _try_call(options, ["set_user_data_path", "set_user_data_dir"], USER_DATA_DIR)
        if PROFILE_DIRECTORY:
            _try_call(options, ["set_argument"], f"--profile-directory={PROFILE_DIRECTORY}")

    if HEADLESS:
        if not _try_call(options, ["set_headless"], True):
            _try_call(options, ["set_argument"], "--headless=new")

    if USE_PROXY:
        if not _try_call(options, ["set_proxy"], PROXY_URL):
            _try_call(options, ["set_argument"], f"--proxy-server={PROXY_URL}")

    # 基础反检测参数
    for arg in [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
        "--disable-web-security",
        "--window-size=1920,1080",
    ]:
        _try_call(options, ["set_argument"], arg)

    return ChromiumPage(options)

# =============================================================================
# 重试装饰器
# =============================================================================

def retry_on_failure(max_retries=3, delay=5):
    """重试装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    logger.warning(f"⚠️ 尝试 {attempt + 1}/{max_retries} 失败: {e}")
                    if attempt == max_retries - 1:
                        logger.error(f"❌ 所有重试失败，函数 {func.__name__} 执行失败")
                        raise e
                    logger.info(f"⏳ 等待 {delay} 秒后重试...")
                    await asyncio.sleep(delay)
            return None
        return wrapper
    return decorator

# =============================================================================
# AI分析函数
# =============================================================================

def analyze_single_post_with_deepseek(post):
    """使用DeepSeek对单个帖子进行深度分析（包含真实评论）"""
    try:
        # 清理楼主内容
        main_content = post.get('content', '')
        clean_content = re.sub(r'<.*?>', ' ', main_content)
        clean_content = re.sub(r'\s+', ' ', clean_content).strip()
        excerpt = (clean_content[:800] + '...') if len(clean_content) > 800 else clean_content

        if not excerpt or len(excerpt.strip()) < 10:
            logger.warning(f"⚠️ 帖子 '{post.get('title', 'N/A')}' 内容过短，跳过AI分析")
            return {
                "error": "内容过短或为空",
                "core_issue": "N/A", 
                "key_info": [], 
                "post_type": "未知", 
                "value_assessment": "低",
                "detailed_analysis": ""
            }

        # 构建评论摘要（真实评论）
        comments_section = ""
        comments = post.get('comments', [])
        comment_count = len(comments)
        
        if comment_count > 0:
            # 按点赞数排序，取前N条
            top_comments = sorted(comments, key=lambda x: x.get('likes', 0), reverse=True)[:TOP_COMMENTS_LIMIT]
            
            comments_summary = []
            for i, comment in enumerate(top_comments, 1):
                author = comment.get('author', '匿名')
                content = comment.get('content', '')[:COMMENT_SUMMARY_LENGTH]  # 限制长度
                likes = comment.get('likes', 0)
                comments_summary.append(f"{i}. [{author}] (👍{likes}): {content}...")
            
            comments_section = f"""

**评论区讨论** ({comment_count}条真实评论)：
{chr(10).join(comments_summary)}
"""
        else:
            comments_section = "\n（暂无评论）"

        # 构建AI分析提示词（社区风向观察版 + 真实评论整合）
        prompt = f"""
你是一名Linux.do社区观察员，擅长捕捉社区热点、资源分享和实用技巧。请基于**楼主内容和评论区真实讨论**，生成一份**轻快实用的分析报告**。

**分析角色定位**：
- 社区风向观察：基于真实评论分析讨论趋势、群体情绪
- 实用资源挖掘：从帖子和评论中发现有价值的工具、教程、优惠、技巧
- 接地气表达：通俗易懂，贴近用户实际需求
- 快速获取要点：让读者3分钟了解核心内容和社区讨论

**重要要求**：
1. 语言轻快、口语化，避免过于学术
2. 重点突出实用性和可操作性
3. **基于真实评论**分析社区讨论热度和情绪（不是推测！）
4. 提炼评论中的有价值观点和解决方案
5. 返回格式必须是纯JSON，不要包含```json```标记

**帖子内容**：
- 标题: {post['title']}
- 楼主内容: {excerpt}{comments_section}

**请严格按以下JSON格式输出**：
{{
  "core_issue": "用一句话概括帖子的核心内容（口语化表达）",
  "key_info": [
    "关键信息点1（突出实用性）",
    "关键信息点2（突出实用性）",
    "关键信息点3（突出实用性）"
  ],
  "post_type": "从[技术问答, 资源分享, 新闻资讯, 优惠活动, 日常闲聊, 求助, 讨论, 产品评测]中选择一个",
  "value_assessment": "从[高, 中, 低]中选择一个",
  "detailed_analysis": "生成500-800字的轻快分析，包含以下内容（用markdown格式）：\\n\\n## 📋 话题背景\\n简要说明这个话题为什么火、为什么重要（2-3句话）\\n\\n## 🎯 核心内容\\n用通俗语言展开楼主帖子的主要内容，突出关键点和有用信息\\n\\n## 💡 实用技巧/资源（如适用）\\n**工具/资源**：从帖子和评论中提取的具体工具、网站、软件推荐\\n**操作方法**：简单的使用步骤或配置方法\\n**注意事项**：评论中提到的常见坑点和避免方法\\n\\n## 💬 社区风向（基于{comment_count}条真实评论）\\n**讨论热度**：评论数量和活跃度（高/中/低），主要讨论方向\\n**情绪倾向**：统计评论中支持/反对/中立的比例，引用典型观点\\n**热门观点**：总结高赞评论的核心观点（2-3条，注明点赞数）\\n**争议焦点**：评论区的主要分歧和不同看法（如有）\\n**实用建议**：评论中提供的解决方案或经验分享\\n\\n## 🔧 实用价值\\n**适用人群**：谁最需要这个信息\\n**使用场景**：什么时候能用上\\n**推荐理由**：为什么值得关注（结合评论反馈）\\n\\n## 🚀 一句话总结\\n用最简洁的话概括这个帖子的价值和社区共识"
}}
"""
        
        # 调用DeepSeek API
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2000,
            "temperature": 0.5
        }
        
        proxies = {"http": PROXY_URL, "https": PROXY_URL} if USE_PROXY else None
        
        response = requests.post(
            DEEPSEEK_API_URL,
            headers=headers,
            json=data,
            proxies=proxies,
            timeout=90  # 增加超时时间，因为需要生成更长的深度分析
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result['choices'][0]['message']['content']
            
            # 解析JSON
            cleaned_text = ai_response.strip().replace("```json", "").replace("```", "").strip()
            analysis_data = json.loads(cleaned_text)
            logger.info(f"✓ AI分析成功: {post['title'][:40]}...")
            return analysis_data
        else:
            logger.error(f"❌ DeepSeek API调用失败: {response.status_code} - {response.text}")
            return {
                "error": f"API调用失败: {response.status_code}",
                "core_issue": "API调用失败", 
                "key_info": [], 
                "post_type": "错误", 
                "value_assessment": "低",
                "detailed_analysis": ""
            }
        
    except json.JSONDecodeError as e:
        ai_resp = locals().get('ai_response', 'N/A')
        logger.error(f"❌ JSON解析失败! AI返回: '{ai_resp[:100] if ai_resp else 'N/A'}...'")
        return {
            "error": "AI返回了非JSON格式的内容", 
            "raw_response": ai_resp[:200] if ai_resp else "N/A",
            "core_issue": "AI分析失败", 
            "key_info": [], 
            "post_type": "错误", 
            "value_assessment": "低",
            "detailed_analysis": ""
        }
    except requests.exceptions.Timeout:
        logger.error(f"❌ DeepSeek API请求超时")
        return {
            "error": "API请求超时",
            "core_issue": "API超时", 
            "key_info": [], 
            "post_type": "错误", 
            "value_assessment": "低",
            "detailed_analysis": ""
        }
    except Exception as e:
        logger.error(f"❌ 分析失败: {post.get('title', 'N/A')[:30]}... - {e}")
        return {
            "error": f"分析失败: {e}",
            "core_issue": "AI分析失败", 
            "key_info": [], 
            "post_type": "错误", 
            "value_assessment": "低",
            "detailed_analysis": ""
        }

# =============================================================================
# 爬虫核心函数
# =============================================================================

async def fetch_post_replies(page, post_url, post_title):
    """
    访问帖子详情页并提取真实评论

    Args:
        page: DrissionPage 页面对象
        post_url: 帖子URL
        post_title: 帖子标题（用于日志）

    Returns:
        dict: 包含楼主内容和评论列表的字典
    """
    try:
        logger.info(f"  ⏳ 访问帖子: {post_title[:40]}...")
        page.get(post_url)

        wait_for_cloudflare_challenge(page, timeout=CF_CHALLENGE_TIMEOUT)
        await asyncio.sleep(3)

        html = get_page_html(page)
        soup = BeautifulSoup(html, "lxml")
        posts_elements = soup.select(".topic-post")

        if not posts_elements:
            logger.warning("    ⚠️ 未找到.topic-post，额外等待5秒后重试...")
            await asyncio.sleep(5)
            html = get_page_html(page)
            soup = BeautifulSoup(html, "lxml")
            posts_elements = soup.select(".topic-post")

        if not posts_elements:
            posts_elements = soup.select("article")
            if not posts_elements:
                logger.error("    ❌ 页面结构异常，无法找到帖子内容")
                debug_file = f"../debug_page_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                with open(debug_file, "w", encoding="utf-8") as f:
                    f.write(html)
                logger.info(f"    📄 已保存页面HTML到: {debug_file}")
                return None
            logger.info("    ✓ 使用article标签作为备用")

        logger.info(f"    ✅ 找到 {len(posts_elements)} 个帖子（1楼主 + {len(posts_elements)-1}评论）")

        main_content = ""
        main_post_elem = posts_elements[0]
        content_elem = main_post_elem.select_one(".cooked")
        if content_elem:
            main_content = content_elem.get_text(strip=True)

        comments = []
        for i, reply_elem in enumerate(posts_elements[1:], start=1):
            try:
                author_elem = reply_elem.select_one(".username")
                author = author_elem.get_text(strip=True) if author_elem else ""

                content_elem = reply_elem.select_one(".cooked")
                content = content_elem.get_text(strip=True) if content_elem else ""

                likes = 0
                likes_elem = reply_elem.select_one(".likes")
                if likes_elem:
                    likes_text = likes_elem.get_text(strip=True)
                    likes = int("".join(filter(str.isdigit, likes_text)) or "0")

                time_str = ""
                time_elem = reply_elem.select_one(".post-date")
                if time_elem:
                    time_str = time_elem.get("title") or ""

                if content:
                    comments.append({
                        "author": author,
                        "content": content,
                        "likes": likes,
                        "time": time_str,
                    })
            except Exception as e:
                logger.warning(f"      ⚠️ 提取评论{i}失败: {e}")
                continue

        logger.info(f"    ✅ 成功提取 {len(comments)} 条评论")

        return {
            "main_content": main_content,
            "comments": comments,
            "total_replies": len(comments),
        }

    except Exception as e:
        logger.error(f"    ❌ 访问帖子详情页失败: {e}")
        import traceback
        logger.error(f"    详细错误:\n{traceback.format_exc()}")
        try:
            html = get_page_html(page)
            debug_file = f"linuxdo/debug_page_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            with open(debug_file, "w", encoding="utf-8") as f:
                f.write(html)
            logger.info(f"    📄 已保存页面HTML到: {debug_file}")
        except Exception:
            pass
        return None

async def fetch_posts_with_replies(page, posts):
    """
    为每个帖子抓取真实评论
    
    Args:
        page: DrissionPage 页面对象
        posts: 帖子列表
    
    Returns:
        list: 包含评论的帖子列表
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"🔍 开始抓取帖子详情页（真实评论）")
    logger.info(f"{'='*60}\n")
    
    enhanced_posts = []
    
    for i, post in enumerate(posts):
        logger.info(f"[{i+1}/{len(posts)}] 处理: {post['title'][:50]}...")
        
        # 访问帖子详情页获取评论
        replies_data = await fetch_post_replies(page, post['link'], post['title'])
        
        if replies_data:
            # 合并数据
            post['main_content'] = replies_data['main_content']
            post['comments'] = replies_data['comments']
            post['total_replies'] = replies_data['total_replies']
            
            # 如果原来的content是从RSS来的，现在替换为真实内容
            if replies_data['main_content']:
                post['content'] = replies_data['main_content']
        else:
            # 如果获取失败，保持原有的RSS description
            post['main_content'] = post.get('content', '')
            post['comments'] = []
            post['total_replies'] = 0
            logger.warning(f"    ⚠️ 使用RSS描述作为降级方案")
        
        enhanced_posts.append(post)
        
        # 请求间隔，避免被封
        if i < len(posts) - 1:
            await asyncio.sleep(REQUEST_INTERVAL)
    
    logger.info(f"\n✅ 完成帖子详情抓取")
    logger.info(f"   总帖子数: {len(enhanced_posts)}")
    logger.info(f"   总评论数: {sum(p.get('total_replies', 0) for p in enhanced_posts)}\n")
    
    return enhanced_posts

@retry_on_failure(max_retries=MAX_RETRIES, delay=RETRY_DELAY)
async def fetch_linuxdo_posts():
    """爬取Linux.do帖子"""
    logger.info("🚀 开始爬取Linux.do帖子...")
    
    page = None
    try:
        page = build_browser_page()

        # 预热：访问首页建立会话
        logger.info(f"⏳ 访问首页预热: {WARM_UP_URL}")
        page.get(WARM_UP_URL)

        # 检测并等待 Cloudflare 挑战
        wait_for_cloudflare_challenge(page, timeout=CF_CHALLENGE_TIMEOUT)

        logger.info("✓ 预热完成")
        await asyncio.sleep(3)

        # 访问RSS源
        logger.info(f"⏳ 访问RSS源: {RSS_URL}")
        page.get(RSS_URL)
        await asyncio.sleep(2)

        # 获取RSS内容
        rss_text = get_page_html(page)

        # 保存调试文件
        debug_filename = f"debug_rss_content_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        with open(debug_filename, "w", encoding="utf-8") as f:
            f.write(rss_text)
        logger.info(f"✓ 已保存调试文件: {debug_filename} ({len(rss_text)} 字符)")

        # 解析RSS内容
        all_posts = []
        logger.info("⏳ 解析RSS内容...")

        # 方式1：直接解析XML
        try:
            root = ET.fromstring(rss_text)
            items = root.findall('.//channel/item')
            logger.info(f"✓ 找到 {len(items)} 个帖子")

            for i, item in enumerate(items[:POST_COUNT_LIMIT]):
                title = item.find('title')
                link = item.find('link')
                description = item.find('description')

                if title is not None and link is not None:
                    title_text = title.text
                    link_text = link.text
                    description_text = description.text if description is not None else ""

                    match = re.search(r'/t/[^/]+/(\d+)', link_text)
                    if match:
                        topic_id = match.group(1)
                        all_posts.append({
                            "title": title_text,
                            "link": link_text,
                            "id": topic_id,
                            "description": description_text,
                        })

        except ET.ParseError:
            # 方式2：从HTML中提取XML
            logger.info("⏳ 尝试从HTML中提取XML...")
            try:
                from bs4 import BeautifulSoup
                import html

                soup = BeautifulSoup(rss_text, 'html.parser')
                pre_tag = soup.find('pre')

                if pre_tag:
                    xml_content = html.unescape(pre_tag.get_text())
                    root = ET.fromstring(xml_content)
                    items = root.findall('.//channel/item')

                    for i, item in enumerate(items[:POST_COUNT_LIMIT]):
                        title = item.find('title')
                        link = item.find('link')
                        description = item.find('description')

                        if title is not None and link is not None:
                            match = re.search(r'/t/[^/]+/(\d+)', link.text)
                            if match:
                                all_posts.append({
                                    "title": title.text,
                                    "link": link.text,
                                    "id": match.group(1),
                                    "description": description.text if description is not None else "",
                                })

            except Exception as e2:
                logger.error(f"❌ HTML提取失败: {e2}")

        # 方式3：正则表达式提取（兜底方案）
        if not all_posts:
            logger.info("⏳ 使用正则表达式提取（兜底方案）...")
            title_pattern = r'<title>([^<]+)</title>'
            link_pattern = r'<link>([^<]+)</link>'
            titles = re.findall(title_pattern, rss_text)
            links = re.findall(link_pattern, rss_text)

            for i, (title, link) in enumerate(zip(titles, links)):
                if i >= POST_COUNT_LIMIT:
                    break
                match = re.search(r'/t/[^/]+/(\d+)', link)
                if match:
                    all_posts.append({
                        "title": title,
                        "link": link,
                        "id": match.group(1),
                        "description": "",
                    })

        logger.info(f"✓ 成功解析 {len(all_posts)} 篇帖子")

        if not all_posts:
            logger.error("❌ 未能解析到任何帖子")
            return []

        # 处理帖子内容
        posts_with_content = []
        for i, post in enumerate(all_posts):
            rss_content = post.get('description', '')

            if rss_content:
                # 提取互动数据："X 个帖子 - Y 位参与者"
                replies_count = 0
                participants_count = 0
                try:
                    match = re.search(r'(\d+)\s*个帖子\s*-\s*(\d+)\s*位参与者', rss_content)
                    if match:
                        replies_count = int(match.group(1))
                        participants_count = int(match.group(2))
                except Exception:
                    pass

                # 清理HTML标签，并移除互动统计语句
                clean_content = re.sub(r'<[^>]+>', ' ', rss_content)
                clean_content = re.sub(r'\d+\s*个帖子\s*-\s*\d+\s*位参与者', '', clean_content)
                clean_content = ' '.join(clean_content.split())

                if len(clean_content.strip()) > 10:
                    post['content'] = clean_content
                    post['replies_count'] = replies_count
                    post['participants_count'] = participants_count
                    logger.info(f"  [{i+1}/{len(all_posts)}] {post['title'][:50]}... ({len(clean_content)} 字符)")
                else:
                    post['content'] = f"帖子标题：{post['title']}"
            else:
                post['content'] = f"帖子标题：{post['title']}"

            posts_with_content.append(post)

            if i < len(all_posts) - 1:
                await asyncio.sleep(1)

        logger.info(f"✓ 获取到 {len(posts_with_content)} 篇帖子（仅RSS描述）")

        # 新增：访问每个帖子详情页抓取真实评论
        posts_with_replies = await fetch_posts_with_replies(page, posts_with_content)

        return posts_with_replies

    except Exception as e:
        logger.error(f"❌ 爬取失败: {e}")
        try:
            if page:
                html = get_page_html(page)
                debug_file = f"linuxdo/debug_page_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                with open(debug_file, "w", encoding="utf-8") as f:
                    f.write(html)
                logger.info(f"📄 已保存页面HTML到: {debug_file}")
        except Exception:
            pass
        raise e
    finally:
        if page:
            try:
                page.quit()
            except Exception:
                pass

# =============================================================================
# 数据库操作
# =============================================================================

async def create_posts_table():
    """创建数据库表"""
    conn = None
    try:
        conn = await asyncpg.connect(NEON_DB_URL, timeout=60)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                core_issue TEXT,
                key_info JSONB,
                post_type TEXT,
                value_assessment TEXT,
                detailed_analysis TEXT,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("✓ 数据库表检查完成")
        return True
    except Exception as e:
        logger.error(f"❌ 数据库表创建失败: {e}")
        return False
    finally:
        if conn:
            await conn.close()

async def insert_posts_into_db(posts_data):
    """插入帖子数据到数据库"""
    max_db_retries = 3
    for attempt in range(max_db_retries):
        conn = None
        try:
            conn = await asyncpg.connect(NEON_DB_URL, timeout=60)
            logger.info(f"⏳ 开始插入数据到数据库 (尝试 {attempt+1}/{max_db_retries})...")
            
            success_count = 0
            # ... (rest of the insertion logic remains the same, but indented) ...
            for post in posts_data:
                try:
                    post_id = post.get('id')
                    title = post.get('title')
                    url = post.get('link')
                    analysis = post.get('analysis', {})
                    core_issue = analysis.get('core_issue')
                    key_info = json.dumps(analysis.get('key_info', []))
                    post_type = analysis.get('post_type')
                    value_assessment = analysis.get('value_assessment')
                    detailed_analysis = analysis.get('detailed_analysis')

                    # 新字段（若存在）：replies_count / participants_count
                    replies_count = int(post.get('replies_count') or 0)
                    participants_count = int(post.get('participants_count') or 0)

                    # 优先尝试插入包含新列的语句；如果失败则回退到旧语句（兼容未迁移的表结构）
                    try:
                        await conn.execute("""
                            INSERT INTO posts (id, title, url, core_issue, key_info, post_type, value_assessment, detailed_analysis, replies_count, participants_count)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                            ON CONFLICT (id) DO UPDATE SET
                                title = EXCLUDED.title,
                                url = EXCLUDED.url,
                                core_issue = EXCLUDED.core_issue,
                                key_info = EXCLUDED.key_info,
                                post_type = EXCLUDED.post_type,
                                value_assessment = EXCLUDED.value_assessment,
                                detailed_analysis = EXCLUDED.detailed_analysis,
                                replies_count = EXCLUDED.replies_count,
                                participants_count = EXCLUDED.participants_count,
                                timestamp = CURRENT_TIMESTAMP;
                        """, post_id, title, url, core_issue, key_info, post_type, value_assessment, detailed_analysis, replies_count, participants_count)
                    except Exception as insert_err:
                        # logger.warning(f"posts 表缺少新列，回退旧插入语句: {insert_err}")
                        await conn.execute("""
                            INSERT INTO posts (id, title, url, core_issue, key_info, post_type, value_assessment, detailed_analysis)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (id) DO UPDATE SET
                                title = EXCLUDED.title,
                                url = EXCLUDED.url,
                                core_issue = EXCLUDED.core_issue,
                                key_info = EXCLUDED.key_info,
                                post_type = EXCLUDED.post_type,
                                value_assessment = EXCLUDED.value_assessment,
                                detailed_analysis = EXCLUDED.detailed_analysis,
                                timestamp = CURRENT_TIMESTAMP;
                        """, post_id, title, url, core_issue, key_info, post_type, value_assessment, detailed_analysis)
                    
                    success_count += 1
                    
                except Exception as e:
                    logger.error(f"❌ 插入帖子失败 [{post.get('id', 'N/A')}]: {e}")
                    continue
            
            logger.info(f"✓ 成功插入 {success_count}/{len(posts_data)} 条数据")
            return success_count > 0

        except Exception as e:
            logger.warning(f"⚠️ 数据库操作失败 (尝试 {attempt+1}): {e}")
            if attempt < max_db_retries - 1:
                await asyncio.sleep(5)
            else:
                logger.error(f"❌ 最终数据库操作失败: {e}")
                return False
        finally:
            if conn:
                await conn.close()

# =============================================================================
# AI报告生成
# =============================================================================

def generate_ai_analysis(posts_data):
    """生成AI分析报告"""
    if not posts_data:
        logger.warning("⚠️ 没有帖子数据")
        return {"summary_analysis": {"error": "没有帖子数据"}, "processed_posts": []}

    logger.info("⏳ 开始AI分析...")
    processed_posts = []
    
    for i, post in enumerate(posts_data):
        logger.info(f"  [{i+1}/{len(posts_data)}] 分析: {post['title'][:40]}...")
        
        try:
            post['analysis'] = analyze_single_post_with_deepseek(post)
            processed_posts.append(post)
            
            if i < len(posts_data) - 1:
                time.sleep(AI_REQUEST_DELAY)
                
        except Exception as e:
            logger.error(f"❌ 分析失败: {e}")
            post['analysis'] = {
                "error": f"分析失败: {e}",
                "core_issue": "分析失败",
                "key_info": [],
                "post_type": "错误",
                "value_assessment": "低",
                "detailed_analysis": ""
            }
            processed_posts.append(post)
            
    logger.info("✓ AI分析完成")

    return {
        "summary_analysis": {"status": "success"},
        "processed_posts": processed_posts
    }

# =============================================================================
# 报告生成
# =============================================================================

def generate_json_report(report_data, posts_count):
    """生成JSON报告"""
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"../data/linux.do_report_{today_str}.json"

        final_json = {
            "meta": {
                "report_date": today_str,
                "title": f"Linux.do 每日热帖报告 ({today_str})",
                "source": "Linux.do",
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
                "title": post.get('title', '无标题'),
                "url": post.get('link', '#'),
                "analysis": post.get('analysis', {})
            })

        # 确保目录存在
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(final_json, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ JSON报告已生成: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"❌ 生成JSON报告失败: {e}")
        return None

# =============================================================================
# 主函数
# =============================================================================

async def main():
    """主函数"""
    start_time = datetime.now()
    logger.info("")
    
    # 环境检查
    if not check_environment():
        return False
    
    try:
        # 1. 创建数据库表
        db_available = True
        if not await create_posts_table():
            logger.warning("⚠️ 数据库连接失败，将仅生成JSON报告")
            db_available = False
        
        # 2. 爬取帖子
        posts_data = await fetch_linuxdo_posts()
        
        if not posts_data:
            logger.error("❌ 未能获取帖子数据")
            return False
        
        logger.info(f"✓ 获取到 {len(posts_data)} 篇帖子")
        
        # 3. AI分析
        report_data = generate_ai_analysis(posts_data)
        
        # 4. 插入数据库
        if report_data.get('processed_posts') and db_available:
            await insert_posts_into_db(report_data['processed_posts'])
        
        # 5. 生成报告
        json_file = generate_json_report(report_data, len(posts_data))
        
        # 完成
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("=" * 80)
        logger.info(f"✓ 任务完成！")
        logger.info(f"  处理时间: {duration:.2f} 秒")
        logger.info(f"  处理帖子: {len(posts_data)} 篇")
        logger.info(f"  生成文件: {json_file}")
        logger.info("=" * 80)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 任务失败: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
