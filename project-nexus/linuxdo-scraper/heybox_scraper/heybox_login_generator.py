
import asyncio
import os
from playwright.async_api import async_playwright
from config import HEYBOX_HOME_URL

AUTH_FILE = 'heybox_auth.json'

async def generate_login_state():
    print("🚀 启动登录生成器...")
    print("⚠️  请注意：浏览器窗口即将弹出。")
    print("👉 请在弹出的窗口中点击右上角【登录】，并使用手机小黑盒App扫码。")
    
    async with async_playwright() as p:
        # 必须使用非无头模式 (headless=False) 才能让你看到并操作
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1600, "height": 900}
        )
        page = await context.new_page()
        
        try:
            print(f"🌐 正在访问: {HEYBOX_HOME_URL}")
            await page.goto(HEYBOX_HOME_URL)
            
            print("⏳ 等待用户登录... (你有 3 分钟时间进行操作)")
            
            # 循环检查登录状态
            # 判断标准：页面上出现用户头像，或者 Cookie 中包含 user_pkey
            logged_in = False
            for i in range(180): # 180秒超时
                # 检查Cookie - 必须同时包含 token 和 pkey 才算有效登录
                cookies = await context.cookies()
                has_token = any(c['name'] == 'x_xhh_tokenid' for c in cookies)
                has_pkey = any(c['name'] == 'user_pkey' for c in cookies)
                
                if has_token and has_pkey:
                    print("\n✅ 检测到完整登录凭证 (Token + PKey)！")
                    logged_in = True
                    break
                
                if i % 5 == 0:
                    print(f"   等待登录... ({i}/180s)", end='\r')
                
                await asyncio.sleep(1)
            
            if logged_in:
                # 给一点时间让所有状态落地
                await asyncio.sleep(3)
                
                # 保存状态
                await context.storage_state(path=AUTH_FILE)
                print(f"\n💾 登录状态已保存至: {os.path.abspath(AUTH_FILE)}")
                print("🎉 现在，你可以运行主爬虫脚本，它将自动使用此文件进行登录。")
            else:
                print("\n❌ 登录超时，未检测到登录状态。")
                
        except Exception as e:
            print(f"\n❌ 发生错误: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(generate_login_state())
