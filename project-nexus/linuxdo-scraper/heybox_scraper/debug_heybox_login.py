
import asyncio
import os
import re
from playwright.async_api import async_playwright
from config import HEYBOX_TOKEN_ID, HEYBOX_USER_PKEY, HEYBOX_HOME_URL

async def debug_login():
    print(f"🔍 开始验证小黑盒登录状态...")
    print(f"Using Token: {HEYBOX_TOKEN_ID[:10]}... (Len: {len(HEYBOX_TOKEN_ID)})")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True) # 可以改为False观看过程
        # 2. 加载保存的登录状态 (auth.json)
        auth_file = 'heybox_auth.json'
        if os.path.exists(auth_file):
            print(f"📖 加载登录状态文件: {auth_file}")
            context = await browser.new_context(
                storage_state=auth_file,
                viewport={"width": 1600, "height": 900},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            print("✅ 状态加载完成")
        else:
            print("⚠️ 未找到 auth.json，回退到游客模式")
            context = await browser.new_context(viewport={"width": 1600, "height": 900})

        page = await context.new_page()
        
        # 3. 访问首页
        print("🌐 访问小黑盒首页...")
        await page.goto(HEYBOX_HOME_URL)
        
        # 3. 刷新生效
        print("🔄 刷新页面...")
        await page.reload(wait_until='networkidle')
        await asyncio.sleep(2) # 等待渲染
        
        # 4. 尝试寻找用户名
        print("🕵️ 正在寻找页面上的用户信息...")
        user_info = await page.evaluate("""
            () => {
                const results = {};
                
                // 1. 尝试找头像
                const avatar = document.querySelector('img[src*="avatar"]');
                if (avatar) results.avatar_src = avatar.src;
                
                // 2. 尝试找任何包含 /user/profile 的链接
                const profileLinks = Array.from(document.querySelectorAll('a[href*="/app/user/profile/"]'));
                results.profile_links_count = profileLinks.length;
                results.profile_texts = profileLinks.map(a => a.innerText.trim()).filter(t => t);
                
                // 3. 尝试通用类名 (猜测)
                const attempts = ['.username', '.user-name', '.nickname', '.header-user', '.user-info'];
                for (let selector of attempts) {
                    const el = document.querySelector(selector);
                    if (el) results[selector] = el.innerText.trim();
                }
                
                // 4. 尝试获取页面标题
                results.title = document.title;
                
                return results;
            }
        """)
        
        print("\n🔎 检测结果:")
        print(f"  - 页面标题: {user_info.get('title')}")
        print(f"  - 发现个人主页链接数: {user_info.get('profile_links_count')}")
        
        if user_info.get('profile_texts'):
            print(f"  - 链接文本内容: {user_info.get('profile_texts')}")
            print(f"  👉 这很可能就是你的用户名！")
        else:
            print("  - 未能提取到明显的用户名文本")
            
        if user_info.get('avatar_src'):
            print("  - ✅ 发现了用户头像图片")
        else:
            print("  - ❌ 未发现用户头像")

        # 5. 截图存证
        screenshot_path = "debug_login_proof.png"
        await page.screenshot(path=screenshot_path)
        print(f"\n📸 已保存网页截图至: {os.path.abspath(screenshot_path)}")
        print("请打开图片直接确认是否已登录。")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_login())
