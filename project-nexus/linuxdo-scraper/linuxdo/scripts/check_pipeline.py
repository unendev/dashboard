import sys
import asyncio
import os
import re
import json
import logging
from datetime import datetime
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
import requests
from dotenv import load_dotenv
import html

# 修复 Windows 控制台中文乱码
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# 加载环境 (尝试多个位置)
import pathlib
current_dir = pathlib.Path(__file__).parent
env_paths = [
    current_dir.parent.parent / '.env_loacl',
    current_dir.parent.parent.parent / '.env',
    current_dir.parent.parent.parent / '.env.local'
]

env_loaded = False
for path in env_paths:
    if path.exists():
        load_dotenv(dotenv_path=path)
        logger.info(f"Loaded env from: {path}")
        env_loaded = True
        break

if not env_loaded:
    logger.warning("No .env file found!")

# 配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
PROXY_URL = os.getenv("PROXY_URL") # May be None
USE_PROXY = PROXY_URL and PROXY_URL.lower() != "none"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

logger.info(f"API Key Present: {bool(DEEPSEEK_API_KEY)}")
logger.info(f"Proxy: {PROXY_URL if USE_PROXY else 'Direct'}")

async def wait_for_cloudflare_challenge(page, timeout=30):
    """简单版 CF 等待"""
    try:
        await page.wait_for_selector('body', state='visible', timeout=5000)
        title = await page.title()
        if "Just a moment" in title or "Checking your browser" in title:
            logger.info("Detected Cloudflare, waiting...")
            await asyncio.sleep(5)
    except Exception:
        pass

def analyze_single_post_with_deepseek(post):
    """简化版 AI 分析"""
    if not DEEPSEEK_API_KEY:
        return {"error": "No API Key"}
        
    logger.info(f"Analyzing post: {post['title']}")
    
    prompt = f"""
    Analyze this forum post. Return ONLY JSON.
    Title: {post['title']}
    Content: {post['content'][:800]}...
    
    Format:
    {{
      "core_issue": "Summary in Chinese",
      "detailed_analysis": "## Analysis\n\nAnalysis content in Markdown (Chinese)..."
    }}
    """
    
    headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
    data = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5
    }
    
    proxies = {"http": PROXY_URL, "https": PROXY_URL} if USE_PROXY else None
    
    try:
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data, proxies=proxies, timeout=60)
        if response.status_code == 200:
            content = response.json()['choices'][0]['message']['content']
            # Clean JSON
            content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(content)
        else:
            return {"error": f"API Error: {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

async def main():
    async with async_playwright() as p:
        # Browser Launch
        launch_args = ['--no-sandbox', '--disable-web-security']
        proxy_cfg = {"server": PROXY_URL} if USE_PROXY else None
        
        browser = await p.chromium.launch(headless=True, args=launch_args, proxy=proxy_cfg)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="zh-CN"
        )
        
        # Stealth
        stealth = Stealth()
        await stealth.apply_stealth_async(context)
        page = await context.new_page()
        
        try:
            # 1. RSS Fetch
            logger.info("Fetching RSS...")
            await page.goto("https://linux.do/latest.rss", wait_until="networkidle", timeout=60000)
            
            # Try to get raw text if browser wrapped it in HTML/pre
            try:
                # Check for <pre> tag which browsers often use to display XML/RSS
                rss_text = await page.evaluate("""() => {
                    const pre = document.querySelector('pre');
                    return pre ? pre.innerText : document.documentElement.outerHTML;
                }""")
            except:
                rss_text = await page.content()

            rss_text = html.unescape(rss_text)
            
            # Simple Regex Extract (Grab just 1 post)
            links = re.findall(r'<link>(https://linux.do/t/[^<]+)</link>', rss_text)
            
            if not links:
                logger.error("No links found in RSS after cleanup!")
                return
            
            target_link = links[1] # Skip first one usually implies channel link
            logger.info(f"Target Post: {target_link}")
            
            # 2. Visit Post
            await page.goto(target_link, wait_until="domcontentloaded", timeout=60000)
            await wait_for_cloudflare_challenge(page)
            
            # Extract Title & Content
            title = await page.title()
            
            # Try multiple selectors for content
            article_text = ""
            try:
                # Try .topic-post .cooked (standard Discourse post body)
                article = await page.wait_for_selector('.topic-post .cooked', state='visible', timeout=10000)
                if article:
                    article_text = await article.text_content()
            except:
                logger.warning("Could not find .topic-post .cooked, trying alternatives...")
                try:
                    article = await page.wait_for_selector('article', state='visible', timeout=5000)
                    article_text = await article.text_content()
                except:
                    logger.warning("Could not find article tag, dumping body...")
                    article_text = await page.evaluate("document.body.innerText")
            
            clean_text = re.sub(r'\s+', ' ', article_text).strip()
            
            post_data = {
                "title": title,
                "link": target_link,
                "content": clean_text
            }
            
            logger.info(f"Extracted Content Length: {len(clean_text)} chars")
            
            # 3. AI Analyze
            analysis = analyze_single_post_with_deepseek(post_data)
            
            # Result
            result = {
                "post": post_data['title'],
                "content_preview": post_data['content'][:200] + "...",
                "ai_analysis": analysis
            }
            
            print("\n" + "="*50)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            print("="*50 + "\n")
            
        except Exception as e:
            logger.error(f"Test failed: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())