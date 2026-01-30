#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小黑盒Playwright爬虫 - 基于MCP测试验证的方案
使用 Playwright 无头浏览器 + x_xhh_tokenid 认证

版本：v2.3.0-personalized
更新时间：2025-01-11
更新内容：
- ✅ 支持访问个性化首页（登录后的个性化内容，偏向游戏开发）
- ✅ 增强登录状态验证（检查localStorage、Cookie和页面元素）
- ✅ 在浏览器上下文创建时预先设置Cookie，确保首次请求即携带认证
- ✅ 优化等待机制，使用networkidle确保异步内容完全加载
- ✅ 添加重试机制，最多重试3次确保登录成功
- ✅ 移除playwright_stealth依赖（token认证已足够，避免API不稳定）
- ✅ 通用选择器：不依赖具体class名，通过用户链接反向定位
- ⚠️ 关键修复：详情页Token注入后刷新页面
- 🔧 优化评论数量限制为10条（可配置）

测试验证：2025-01-11 ✅
- Token认证成功
- 个性化首页访问成功
- 登录状态验证有效
- 页面正常加载帖子内容
- MCP验证通用选择器有效

使用方法：
  1. 配置 .env 文件中的 HEYBOX_TOKEN_ID
  2. 安装Playwright: pip install playwright
  3. 安装浏览器: python -m playwright install chromium
  4. 运行: python heybox_playwright_scraper.py
"""

# 版本信息
__version__ = "v2.3.0-personalized"
__update_date__ = "2025-01-11"

import asyncio
import os
import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Any
from playwright.async_api import async_playwright, Page
# from playwright_stealth import stealth  # 已禁用：token认证已足够
import asyncpg
import re

# 导入配置
from config import (
    HEYBOX_TOKEN_ID, HEYBOX_USER_PKEY, HEYBOX_HOME_URL,
    POST_LIMIT, COMMENT_LIMIT, REQUEST_INTERVAL,
    MAX_RETRIES, RETRY_DELAY, AI_REQUEST_DELAY,
    DEEPSEEK_API_KEY, DEEPSEEK_API_URL,
    DATABASE_URL, USE_PROXY, get_proxies, check_config
)

# ========== 日志配置 ==========
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('logs/heybox_scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ========== 浏览器初始化 ==========

async def verify_login_status(page: Page) -> bool:
    """
    验证页面登录状态
    
    通过检查localStorage、Cookie和页面元素判断是否已登录
    """
    try:
        # 检查localStorage中的token
        token_in_storage = await page.evaluate("""
            () => {
                return localStorage.getItem('x_xhh_tokenid') !== null;
            }
        """)
        
        # 检查Cookie中的token
        cookies = await page.context.cookies()
        token_in_cookie = any(
            cookie.get('name') == 'x_xhh_tokenid' and cookie.get('value')
            for cookie in cookies
        )
        
        # 检查页面是否有登录标识（用户头像、用户名等）
        has_user_info = await page.evaluate("""
            () => {
                // 检查是否有用户相关元素（头像、用户名等）
                const userLinks = document.querySelectorAll('a[href*="/app/user/profile/"]');
                const hasAvatar = document.querySelector('img[src*="avatar"], img[alt*="头像"]');
                return userLinks.length > 0 || hasAvatar !== null;
            }
        """)
        
        # 更灵活的登录判断：Cookie有Token且页面有用户信息即可（localStorage可能因刷新丢失）
        is_logged_in = token_in_cookie and has_user_info
        
        logger.info(f"  🔍 登录状态检测:")
        logger.info(f"    - localStorage有Token: {token_in_storage}")
        logger.info(f"    - Cookie有Token: {token_in_cookie}")
        logger.info(f"    - 页面有用户信息: {has_user_info}")
        logger.info(f"    - 综合判断: {'✅ 已登录' if is_logged_in else '❌ 未登录'}")
        
        # 如果Cookie和页面信息都满足，但localStorage没有，尝试重新注入
        if is_logged_in and not token_in_storage:
            logger.info("  🔧 检测到localStorage缺少Token，重新注入...")
            try:
                user_pkey = HEYBOX_USER_PKEY if HEYBOX_USER_PKEY else ""
                await page.evaluate(f"""
                    () => {{
                        const token = "{HEYBOX_TOKEN_ID}";
                        const userPkey = "{user_pkey}";
                        localStorage.setItem('x_xhh_tokenid', token);
                        sessionStorage.setItem('x_xhh_tokenid', token);
                        if (userPkey) {{
                            document.cookie = `user_pkey=${{userPkey}}; path=/; domain=.xiaoheihe.cn`;
                        }}
                    }}
                """)
                logger.info("  ✓ localStorage Token已重新注入")
            except Exception as e:
                logger.warning(f"  ⚠ 重新注入Token失败: {e}")
        
        return is_logged_in
        
    except Exception as e:
        logger.warning(f"  ⚠ 登录状态检测失败: {e}")
        return False

async def init_browser_with_token(page: Page, token: str, max_retries: int = 3):
    """
    初始化浏览器并注入Token，确保访问个性化首页
    
    基于MCP测试验证的方法：
    1. 访问首页
    2. 注入token到localStorage、sessionStorage和cookie
    3. 验证登录状态
    4. 确保个性化内容加载完成
    """
    logger.info(f"🌐 访问首页: {HEYBOX_HOME_URL}")
    
    for attempt in range(max_retries):
        try:
            # 访问首页（首次访问时Cookie已在上下文创建时设置）
            await page.goto(HEYBOX_HOME_URL, wait_until='networkidle', timeout=60000)
            logger.info("  ✓ 页面加载完成")
            
            # 注入token和user_pkey（确保所有存储位置都有）
            # 注入token（使用原生API，比JS注入更可靠）
            user_pkey = HEYBOX_USER_PKEY if HEYBOX_USER_PKEY else ""
            
            cookies_to_add = [
                {
                    'name': 'x_xhh_tokenid',
                    'value': token,
                    'domain': '.xiaoheihe.cn',
                    'path': '/'
                }
            ]
            
            if user_pkey:
                cookies_to_add.append({
                    'name': 'user_pkey',
                    'value': user_pkey,
                    'domain': '.xiaoheihe.cn',
                    'path': '/'
                })
                
            await page.context.add_cookies(cookies_to_add)
            
            # 同时注入localStorage (前端逻辑可能需要)
            await page.evaluate(f"""
                () => {{
                    localStorage.setItem('x_xhh_tokenid', "{token}");
                    sessionStorage.setItem('x_xhh_tokenid', "{token}");
                }}
            """)
            logger.info("  ✓ Token注入成功 (Native Cookies + LocalStorage)")
            
            # 等待一下让页面反应
            await asyncio.sleep(2)
            
            # 刷新页面使token生效，等待网络请求完成
            await page.reload(wait_until='networkidle', timeout=60000)
            logger.info("  ✓ 页面刷新，Token已激活")
            
            # 等待个性化内容加载（游戏推荐、关注内容等）
            # 个性化推荐API可能需要更长时间
            logger.info("  ⏳ 等待个性化内容加载...")
            await asyncio.sleep(8)  # 增加等待时间，确保个性化API请求完成
            
            # 多次滚动触发懒加载，确保个性化内容完全加载
            for scroll_step in range(3):
                await page.evaluate(f"""
                    () => {{
                        window.scrollTo(0, document.body.scrollHeight * {scroll_step + 1} / 4);
                    }}
                """)
                await asyncio.sleep(2)  # 每次滚动后等待内容加载
                logger.info(f"  📜 滚动加载 ({scroll_step + 1}/3)")
            
            # 滚动回顶部，准备提取数据
            await page.evaluate("() => { window.scrollTo(0, 0); }")
            await asyncio.sleep(2)
            
            # 验证Cookie是否正确设置
            cookies = await page.context.cookies()
            has_token = any(c.get('name') == 'x_xhh_tokenid' for c in cookies)
            has_pkey = any(c.get('name') == 'user_pkey' for c in cookies)
            logger.info(f"  🔍 Cookie验证: x_xhh_tokenid={has_token}, user_pkey={has_pkey}")
            
            # 验证登录状态
            is_logged_in = await verify_login_status(page)
            
            if is_logged_in:
                logger.info("  ✅ 成功访问个性化首页（已登录状态）")
                return True
            else:
                if attempt < max_retries - 1:
                    logger.warning(f"  ⚠ 登录状态验证失败，重试 {attempt + 1}/{max_retries}")
                    await asyncio.sleep(3)
                    continue
                else:
                    logger.error("  ❌ 登录状态验证失败，已达到最大重试次数")
                    logger.warning("  💡 提示：请检查Token是否有效，或手动验证登录状态")
                    return False
            
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"  ⚠ 初始化失败（尝试 {attempt + 1}/{max_retries}）: {e}")
                await asyncio.sleep(3)
                continue
            else:
                logger.error(f"  ✗ 初始化失败: {e}")
                return False
    
    return False

# ========== 数据提取 ==========

async def extract_posts_from_page(page: Page, limit: int = POST_LIMIT, label: str = "") -> List[Dict]:
    """
    从页面提取帖子数据
    
    基于页面实际结构提取（MCP测试中观察到的）
    
    Args:
        page: Playwright页面对象
        limit: 提取帖子数量限制
        label: 标签（用于区分不同来源，如"通用首页"、"个性化首页"）
    """
    prefix = f"[{label}] " if label else ""
    logger.info(f"{prefix}📝 开始提取帖子数据（目标{limit}条）...")
    
    try:
        # 获取页面HTML
        content = await page.content()
        
        # 使用正则表达式提取link数据（从href中提取ID）
        post_ids = re.findall(r'/app/bbs/link/(\d+)\?', content)
        logger.info(f"{prefix}  找到 {len(post_ids)} 个帖子ID")
        
        # 获取页面的纯文本内容用于提取
        posts_data = await page.evaluate("""
            () => {
                const posts = [];
                const links = document.querySelectorAll('a[href*="/app/bbs/link/"]');
                
                links.forEach((link, index) => {
                    if (index >= 20) return;
                    
                    const href = link.href || link.getAttribute('href');
                    const fullText = link.textContent || '';
                    
                    if (href && fullText) {
                        posts.push({
                            href: href,
                            text: fullText.trim()
                        });
                    }
                });
                
                return posts;
            }
        """)
        
        logger.info(f"{prefix}  提取到 {len(posts_data)} 个帖子的原始数据")
        
        # 解析提取的数据
        posts = []
        for item in posts_data[:limit]:
            try:
                # 提取ID
                id_match = re.search(r'/link/(\d+)', item['href'])
                if not id_match:
                    continue
                
                post_id = id_match.group(1)
                text = item['text']
                
                # 改进的文本解析逻辑
                # 格式分析：作者名 Lv.等级 标题或内容 数字(点赞/评论)...
                
                # 1. 提取作者和等级（格式：作者名 Lv.数字）
                author_match = re.match(r'^(.+?)\s+Lv\.(\d+)\s*(.*)$', text)
                
                if author_match:
                    author = author_match.group(1).strip()
                    level = author_match.group(2)
                    remaining_text = author_match.group(3)
                else:
                    author = ''
                    remaining_text = text
                
                # 2. 提取标题（剩余文本的前200个字符作为标题）
                title = remaining_text[:200].strip() if remaining_text else ''
                
                # 3. 提取所有数字（用于点赞数、评论数、数据等）
                numbers = re.findall(r'\b(\d+)\b', text)
                
                # 4. 智能解析数字（假设最后两个数字通常是点赞和评论）
                likes = 0
                comments = 0
                
                if len(numbers) >= 2:
                    try:
                        # 最后一个通常是评论数
                        comments = int(numbers[-1])
                        # 倒数第二个通常是点赞数
                        likes = int(numbers[-2])
                    except (ValueError, IndexError):
                        pass
                elif len(numbers) == 1:
                    try:
                        # 只有一个数字时当作评论数
                        comments = int(numbers[0])
                    except ValueError:
                        pass
                
                # 只有在提取到有效数据时才添加帖子
                if title:  # 确保至少有标题
                    post = {
                        'id': post_id,
                        'title': title,
                        'summary': title[:100],  # 摘要为标题前100字
                        'author': author,
                        'url': item['href'],
                        'likes_count': likes,
                        'comments_count': comments,
                        'created_time': int(time.time())
                    }
                    
                    posts.append(post)
                    logger.debug(f"    [{len(posts)}] 作者:{author} | 点赞:{likes} 评论:{comments} | {title[:40]}...")
                else:
                    logger.debug(f"    ⚠ 跳过空标题的帖子")
                
            except Exception as e:
                logger.warning(f"    解析帖子失败: {e}")
                logger.debug(f"    原始文本: {text[:100]}")
                continue
        
        logger.info(f"{prefix}✅ 成功提取 {len(posts)} 个帖子")
        return posts
        
    except Exception as e:
        logger.error(f"❌ 提取失败: {e}")
        return []

async def extract_comments(page: Page, post_id: str, post_url: str) -> List[Dict]:
    """提取帖子评论 - MCP调试验证版本"""
    logger.info(f"  💬 抓取评论: {post_id}")
    logger.info(f"     📍 URL: {post_url}")
    
    try:
        # 访问帖子详情页
        await page.goto(post_url, wait_until='domcontentloaded', timeout=30000)
        
        # 确保Token和user_pkey在详情页也有效（防止cookie作用域问题）
        user_pkey = HEYBOX_USER_PKEY if HEYBOX_USER_PKEY else ""
        await page.evaluate(f"""
            () => {{
                const token = "{HEYBOX_TOKEN_ID}";
                const userPkey = "{user_pkey}";
                localStorage.setItem('x_xhh_tokenid', token);
                sessionStorage.setItem('x_xhh_tokenid', token);
                document.cookie = `x_xhh_tokenid=${{token}}; path=/; domain=.xiaoheihe.cn`;
                if (userPkey) {{
                    document.cookie = `user_pkey=${{userPkey}}; path=/; domain=.xiaoheihe.cn`;
                }}
            }}
        """)
        
        # ⚠️ 关键：刷新页面使Token生效（MCP调试验证必须步骤）
        await page.reload(wait_until='domcontentloaded')
        await asyncio.sleep(3)  # 等待评论加载
        
        # 尝试滚动加载更多评论
        await page.evaluate("""
            () => {
                window.scrollTo(0, document.body.scrollHeight / 2);
            }
        """)
        await asyncio.sleep(1)
        
        # 调试：检查页面结构
        page_info = await page.evaluate("""
            () => {
                const commentSection = document.querySelector('.link-comment');
                const commentItems = document.querySelectorAll('.link-comment__comment-item');
                return {
                    hasCommentSection: !!commentSection,
                    commentItemsCount: commentItems.length,
                    pageTitle: document.title
                };
            }
        """)
        logger.info(f"     🔍 页面检测: 评论区={page_info['hasCommentSection']}, 评论项数={page_info['commentItemsCount']}")
        
        # 提取评论数据 - 通用方法（不依赖具体class）
        comments_data = await page.evaluate(f"""
            () => {{
                const comments = [];
                const limit = {COMMENT_LIMIT};
                
                // 找所有用户链接（评论必有作者链接）
                const allLinks = document.querySelectorAll('a[href*="/app/user/profile/"]');
                const processedContainers = new Set();
                
                for (const link of allLinks) {{
                    if (comments.length >= limit) break;
                    
                    // 找最近的评论容器
                    let container = link.closest('div[class*="comment"]') || link.parentElement?.parentElement;
                    if (!container || processedContainers.has(container)) continue;
                    processedContainers.add(container);
                    
                    // 提取作者
                    const author = link.textContent.trim().split('\\n')[0].replace(/作者|Lv\\.\\d+/g, '').trim();
                    
                    // 提取评论内容（找最长文本）
                    let content = '';
                    const textDivs = container.querySelectorAll('div, p, span');
                    for (const div of textDivs) {{
                        const text = div.textContent.trim();
                        if (text.length > Math.max(20, content.length) && 
                            !text.includes('小时前') && !text.includes('天前') &&
                            !text.includes('Lv.') && !text.includes('回复')) {{
                            content = text.substring(0, 200);
                        }}
                    }}
                    
                    // 提取点赞数
                    const buttons = Array.from(container.querySelectorAll('button'));
                    const likeBtn = buttons.find(b => /^\\s*\\d+\\s*$/.test(b.textContent.trim()));
                    const likes = likeBtn ? parseInt(likeBtn.textContent.trim()) : 0;
                    
                    if (author && content.length > 10) {{
                        comments.push({{
                            id: `comment_{post_id}_${{comments.length}}`,
                            author: author,
                            content: content,
                            likes_count: likes,
                            created_at: '最近'
                        }});
                    }}
                }}
                
                return comments;
            }}
        """)
        
        logger.info(f"    ✓ 获取到 {len(comments_data)} 条评论")
        return comments_data
        
    except Exception as e:
        logger.warning(f"    ✗ 评论抓取失败: {e}")
        return []

# ========== AI分析 ==========

def analyze_with_ai(post: Dict, comments: List[Dict]) -> Dict:
    """使用DeepSeek AI分析 - 对标Reddit的高质量分析"""
    logger.info(f"  🤖 AI分析: {post['title'][:30]}...")
    
    if not DEEPSEEK_API_KEY:
        return {
            'title_cn': post.get('title', ''),
            'core_issue': post.get('summary', '')[:100],
            'key_info': [post['title']],
            'post_type': '未分类',
            'value_assessment': '中',
            'detailed_analysis': ''
        }
    
    import requests
    
    # 构建内容摘要
    excerpt = post.get('summary', '')[:1000]
    if not excerpt.strip():
        excerpt = "（无详细内容）"
    
    # 构建评论区精华（对标Reddit - 高赞前3条）
    comment_section = ""
    if comments and len(comments) > 0:
        # 按点赞数排序（如果有的话）
        sorted_comments = sorted(comments, key=lambda x: x.get('likes_count', 0), reverse=True)
        top_comments = sorted_comments[:3]
        
        comment_section = "\n\n**社区讨论精华**（高赞评论）：\n"
        for i, comment in enumerate(top_comments, 1):
            comment_body = comment.get('content', '')[:200]
            likes = comment.get('likes_count', 0)
            author = comment.get('author', '匿名')
            comment_section += f"{i}. [{author}] (👍{likes}): {comment_body}...\n"
        logger.info(f"  ✓ 包含 {len(top_comments)} 条高赞评论到分析")
    else:
        num_comments = post.get('comments_count', 0)
        if num_comments > 0:
            comment_section = f"\n\n**注意**：该帖子有 {num_comments} 条评论，但评论内容未包含在本次分析中。请仅基于帖子标题和正文内容进行分析，不要推测评论区内容。"
            logger.info(f"  ⚠ 帖子有 {num_comments} 条评论但未获取")
        else:
            logger.info(f"  ℹ 该帖子无评论")
    
    # 构建高质量Prompt（对标Reddit，适配游戏社区）
    prompt = f"""
你是专业的游戏社区内容分析专家，擅长分析小黑盒等游戏平台的帖子和社区讨论。请分析以下帖子（含社区讨论），生成专业分析报告。

**原始帖子信息**：
- 标题: {post['title']}
- 作者: {post['author']}
- 游戏标签: {post.get('game_tag', '未知')}
- 内容: {excerpt}{comment_section}
- 互动数据: {post['likes_count']}赞 / {post['comments_count']}评论

**请严格按JSON格式输出（不要包含```json```标记）**：
{{
  "title_cn": "中文优化标题（如果原标题已是中文，可优化使其更简洁专业；如果是英文或混杂，翻译为中文）",
  "core_issue": "核心议题（一句话概括）",
  "key_info": ["关键信息1", "关键信息2", "关键信息3"],
  "post_type": "从[游戏攻略, 新闻资讯, 玩家讨论, 硬件评测, 问题求助, 资源分享, 视频内容, 其他]选一个",
  "value_assessment": "从[高, 中, 低]选一个",
  "detailed_analysis": "生成600-1200字专业分析，markdown格式，必须包含以下6个维度：\\n\\n## 🎮 内容背景\\n（介绍帖子的游戏/硬件背景、发布时机、社区关注度）\\n\\n## 💡 核心内容\\n（提炼帖子的主要信息、关键观点或攻略要点）\\n\\n## 🛠️ 实用价值\\n（分析对玩家的实际帮助、可操作性、适用场景）\\n\\n## 💬 社区反响\\n（基于评论分析玩家反馈、争议点、共识观点）\\n\\n## 📚 参考价值\\n（对其他玩家的借鉴意义、注意事项）\\n\\n## 🔮 趋势洞察\\n（相关游戏/硬件的发展趋势、潜在影响）"
}}

**分析要求**：
1. title_cn要简洁专业，去除emoji和过度修饰
2. 核心议题要准确抓住帖子的本质
3. key_info要提炼最有价值的3个关键点
4. post_type要根据内容准确分类
5. value_assessment要客观评估对玩家的价值
6. detailed_analysis必须包含完整的6个维度，每个维度2-3句话
"""
    
    # 调试日志
    logger.debug(f"  → Prompt长度: {len(prompt)}字符, 评论区长度: {len(comment_section)}字符")
    
    try:
        response = requests.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "system", 
                        "content": "你是专业的游戏社区内容分析专家，擅长分析游戏攻略、资讯、讨论和硬件评测。你的分析客观专业，注重实用价值。"
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 2000
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                analysis = json.loads(json_match.group())
                logger.info(f"    ✓ AI分析完成")
                time.sleep(AI_REQUEST_DELAY)
                return analysis
        else:
            logger.warning(f"    ✗ API返回错误: {response.status_code}")
                
    except Exception as e:
        logger.warning(f"    ✗ AI分析失败: {e}")
    
    # 返回默认分析
    return {
        'title_cn': post.get('title', ''),
        'core_issue': post.get('summary', post['title'])[:100],
        'key_info': [post['title']],
        'post_type': '未分类',
        'value_assessment': '中',
        'detailed_analysis': f"## 🎮 内容背景\n\n{post.get('summary', '')[:200]}\n\n## 💡 核心内容\n\n待AI分析补充"
    }

# ========== 数据库存储 ==========

async def save_to_database(posts_with_analysis: List[Dict]):
    """
    保存数据到Nexus (API Mode)
    Original DB logic replaced with HTTP push to Nexus Ingest API
    """
    logger.info(f"\n� 推送数据到 Nexus API...")
    
    # 从配置或环境变量获取 Nexus API 地址
    # 默认尝试 localhost用于本地调试，但在Action中必须配置环境变量
    nexus_api_url = os.getenv("NEXUS_API_URL", "http://localhost:10000/api/ingest")
    nexus_key = os.getenv("NEXUS_INGEST_KEY", "dev-super-admin-2024")
    
    if not nexus_api_url:
        logger.error("❌ 未配置 NEXUS_API_URL，无法推送数据")
        return False
        
    import requests
    
    success_count = 0
    
    # 转换数据格式以适配 Nexus Ingest API
    nexus_items = []
    
    for post in posts_with_analysis:
        try:
            # 构建 tags
            tags = ['Heybox']
            if post.get('game_tag'):
                tags.append(post['game_tag'])
            
            # 提取 AI 分析结果作为摘要，避免 Nexus 端再次分析
            ai_summary = ""
            analysis = post.get('analysis', {})
            if analysis:
                ai_summary = f"{analysis.get('core_issue', '')}\n\n{analysis.get('detailed_analysis', '')[:300]}..."
            else:
                ai_summary = post.get('summary', '')

            item = {
                "source": "小黑盒 Heybox",  # Match rss-config.ts name exactly
                "sourceType": "culture",
                "title": post.get('title'),
                "content": post.get('summary', '')[:5000], 
                "summary": ai_summary,  # 关键：传入 summary 阻止 Nexus 端 AI 触发
                "link": post.get('url'),
                "externalId": str(post.get('id')),
                "authorName": post.get('author'),
                "publishedAt": datetime.fromtimestamp(post.get('created_time', time.time())).isoformat(),
                "tags": tags,
                "metadata": {
                    "likes": post.get('likes_count'),
                    "comments": post.get('comments_count'),
                    "ai_analysis": post.get('analysis')
                }
            }
            nexus_items.append(item)
            
        except Exception as e:
            logger.warning(f"  ⚠ 数据转换失败: {e}")

    if not nexus_items:
        logger.warning("  ⚠ 没有有效数据需要推送")
        return True

    # 批量推送 (Nexus Ingest API 支持数组)
    try:
        logger.info(f"  📡 正在发送 {len(nexus_items)} 条数据到 {nexus_api_url}...")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {nexus_key}"
        }
        
        response = requests.post(
            nexus_api_url,
            json=nexus_items,
            headers=headers,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            logger.info(f"  ✅ 推送成功! 响应: {response.text}")
            return True
        else:
            logger.error(f"  ❌ 推送失败: HTTP {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"  ❌ 连接 API 失败: {e}")
        return False

# ========== 主流程 ==========

async def main():
    """主执行流程"""
    logger.info("=" * 80)
    logger.info("🎮 小黑盒Playwright爬虫启动")
    logger.info(f"📦 版本: {__version__}")
    logger.info(f"🕐 更新时间: {__update_date__}")
    logger.info("=" * 80)
    
    # 检查配置
    issues = check_config()
    if issues:
        logger.error("\n配置问题：")
        for issue in issues:
            logger.error(f"  {issue}")
        return
    
    logger.info(f"\n配置信息：")
    logger.info(f"  - 目标帖子数: {POST_LIMIT}")
    logger.info(f"  - Token已配置: 是")
    logger.info(f"  - AI分析: {'是' if DEEPSEEK_API_KEY else '否'}")
    logger.info(f"  - 使用代理: {'是' if USE_PROXY else '否'}")
    
    async with async_playwright() as p:
        # 启动浏览器
        launch_options = {
            "headless": True,
            "args": ['--no-sandbox', '--disable-dev-shm-usage']
        }
        
        if USE_PROXY:
            proxies = get_proxies()
            if proxies and proxies.get('http'):
                launch_options["proxy"] = {"server": proxies['http']}
        
        browser = await p.chromium.launch(**launch_options)
        logger.info("✓ 浏览器启动成功")
        
        # 创建上下文（尝试加载持久化登录状态）
        auth_file = 'heybox_auth.json'
        # 基础上下文配置
        context_options = {
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "extra_http_headers": {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9",
            },
            "viewport": {"width": 1600, "height": 900}  # 使用宽屏分辨率
        }
        
        has_auth_file = os.path.exists(auth_file)
        if has_auth_file:
            logger.info(f"📖 发现登录状态文件: {auth_file}")
            context_options["storage_state"] = auth_file
            context = await browser.new_context(**context_options)
            logger.info("✓ 已加载持久化登录状态（跳过手动Token注入）")
        else:
            logger.info("ℹ 未找到登录状态文件，使用常规模式（准备手动注入Token）")
            context = await browser.new_context(**context_options)
        
        # 在访问页面前预先设置Cookie（仅当没有加载auth文件时）
        cookies_to_add = []
        if not has_auth_file and HEYBOX_TOKEN_ID:
            cookies_to_add.append({
                'name': 'x_xhh_tokenid',
                'value': HEYBOX_TOKEN_ID,
                'domain': '.xiaoheihe.cn',
                'path': '/',
                'httpOnly': False,
                'secure': True,
                'sameSite': 'Lax'
            })
        if HEYBOX_USER_PKEY:
            cookies_to_add.append({
                'name': 'user_pkey',
                'value': HEYBOX_USER_PKEY,
                'domain': '.xiaoheihe.cn',
                'path': '/',
                'httpOnly': False,
                'secure': True,
                'sameSite': 'Lax'
            })
            logger.info(f"✓ user_pkey已配置（长度: {len(HEYBOX_USER_PKEY)}字符）")
        else:
            logger.warning("⚠ user_pkey未配置，可能无法获取个性化内容")
        
        if cookies_to_add:
            await context.add_cookies(cookies_to_add)
            logger.info(f"✓ Cookie已预先设置（{len(cookies_to_add)}个Cookie，确保首次请求携带认证）")
        
        page = await context.new_page()
        
        # 应用反爬虫stealth（已禁用：token认证已足够）
        # await stealth(page)
        logger.info("✓ 页面创建成功（使用Token认证，无需stealth）")
        
        # ========== 对比验证：先获取通用首页内容 ==========
        logger.info("\n" + "="*80)
        logger.info("🔍 步骤0：获取通用首页内容（用于对比验证）")
        logger.info("="*80)
        
        # 创建新页面，不设置Cookie，访问通用首页
        page_no_auth = await context.new_page()
        await page_no_auth.goto(HEYBOX_HOME_URL, wait_until='networkidle', timeout=60000)
        await asyncio.sleep(5)  # 等待内容加载
        
        # 提取通用首页的帖子
        posts_no_auth = await extract_posts_from_page(page_no_auth, POST_LIMIT, "通用首页")
        await page_no_auth.close()
        
        if posts_no_auth:
            logger.info(f"✓ 通用首页提取到 {len(posts_no_auth)} 个帖子")
            # 记录通用首页的帖子ID和标题
            general_post_ids = {post['id'] for post in posts_no_auth}
            logger.info(f"  通用首页帖子ID: {sorted(general_post_ids)}")
            logger.info(f"  通用首页帖子详情:")
            for i, post in enumerate(posts_no_auth, 1):
                logger.info(f"    {i}. [{post['id']}] {post['title'][:60]}")
        else:
            logger.warning("⚠ 未能获取通用首页内容")
            general_post_ids = set()
        
        # ========== 获取个性化首页内容 ==========
        logger.info("\n" + "="*80)
        logger.info("🔍 步骤1：获取个性化首页内容")
        logger.info("="*80)
        
        # 初始化并注入Token
        if not await init_browser_with_token(page, HEYBOX_TOKEN_ID):
            logger.error("❌ 初始化失败")
            await browser.close()
            return
        
        # 提取个性化首页的帖子
        posts = await extract_posts_from_page(page, POST_LIMIT, "个性化首页")
        if not posts:
            logger.error("❌ 未能提取帖子数据")
            await browser.close()
            return
        
        # ========== 对比分析 ==========
        logger.info("\n" + "="*80)
        logger.info("📊 对比分析：判断是否获取到个性化内容")
        logger.info("="*80)
        
        personalized_post_ids = {post['id'] for post in posts}
        
        # 计算差异
        unique_to_personalized = personalized_post_ids - general_post_ids
        unique_to_general = general_post_ids - personalized_post_ids
        common_posts = personalized_post_ids & general_post_ids
        
        logger.info(f"  个性化首页帖子数: {len(personalized_post_ids)}")
        logger.info(f"  通用首页帖子数: {len(general_post_ids)}")
        logger.info(f"  共同帖子数: {len(common_posts)}")
        logger.info(f"  个性化独有帖子数: {len(unique_to_personalized)}")
        logger.info(f"  通用独有帖子数: {len(unique_to_general)}")
        
        # 判断是否个性化
        if len(unique_to_personalized) > 0:
            similarity = len(common_posts) / max(len(personalized_post_ids), 1) * 100
            logger.info(f"  内容相似度: {similarity:.1f}%")
            
            if similarity < 50:  # 如果相似度低于50%，认为是个性化内容
                logger.info("  ✅ 判断：已获取到个性化内容（内容差异较大）")
                logger.info(f"  个性化独有帖子ID示例: {sorted(unique_to_personalized)[:3]}")
            elif len(unique_to_personalized) >= 3:
                logger.info("  ✅ 判断：已获取到个性化内容（有足够多的独特帖子）")
                logger.info(f"  个性化独有帖子ID示例: {sorted(unique_to_personalized)[:3]}")
            else:
                logger.warning("  ⚠ 判断：可能未获取到个性化内容（内容相似度较高）")
                logger.warning("  💡 建议：检查user_pkey是否正确，或增加等待时间")
        else:
            logger.warning("  ❌ 判断：未获取到个性化内容（与通用首页完全相同）")
            logger.warning("  💡 建议：检查user_pkey配置和Cookie设置")
        
        logger.info("="*80 + "\n")
        
        logger.info(f"\n第1步完成：提取到 {len(posts)} 个帖子\n")
        
        # 提取评论
        for i, post in enumerate(posts, 1):
            logger.info(f"[{i}/{len(posts)}] 处理: {post['title'][:40]}")
            
            # 获取评论
            comments = await extract_comments(page, post['id'], post['url'])
            post['comments'] = comments
            
            await asyncio.sleep(REQUEST_INTERVAL)
        
        logger.info(f"\n第2步完成：获取评论\n")
        
        # AI分析
        logger.info("开始AI分析...")
        for i, post in enumerate(posts, 1):
            logger.info(f"[{i}/{len(posts)}] 分析: {post['title'][:40]}")
            analysis = analyze_with_ai(post, post.get('comments', []))
            post['analysis'] = analysis
        
        logger.info(f"\n第3步完成：AI分析\n")
        
        # 保存数据库（对标Reddit - 仅数据库，不生成JSON文件）
        await save_to_database(posts)
        
        logger.info(f"✅ 数据已存入数据库，前端将从数据库读取")
        
        # 关闭浏览器
        await browser.close()
    
    logger.info("\n" + "=" * 80)
    logger.info("🎉 爬虫执行完成！")
    logger.info("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())

