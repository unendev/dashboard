import asyncio
import os
from playwright.async_api import async_playwright
from dotenv import load_dotenv

# 加载环境
load_dotenv()
REAL_TOKEN = os.getenv("HEYBOX_TOKEN_ID")
REAL_PKEY = os.getenv("HEYBOX_USER_PKEY")
URL = "https://www.xiaoheihe.cn/app/bbs/home"

async def extract_titles(page, label):
    print(f"\n--- {label} ---")
    try:
        await page.goto(URL, wait_until='networkidle', timeout=60000)
        await asyncio.sleep(5)
        
        # 提取标题
        titles = await page.evaluate(r"""
            () => {
                const results = [];
                const links = document.querySelectorAll('a[href*="/app/bbs/link/"]');
                links.forEach((link, index) => {
                    if (index >= 15) return;
                    let text = link.textContent.trim();
                    // 简单清洗
                    results.push(text.substring(0, 50));
                });
                return results;
            }
        """)
        
        for i, t in enumerate(titles, 1):
            print(f"{i}. {t}")
        return set(titles)
    except Exception as e:
        print(f"Error: {e}")
        return set()

async def run_test(token, pkey, label):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        if token:
            cookies = [
                {'name': 'x_xhh_tokenid', 'value': token, 'domain': '.xiaoheihe.cn', 'path': '/'}
            ]
            if pkey:
                cookies.append({'name': 'user_pkey', 'value': pkey, 'domain': '.xiaoheihe.cn', 'path': '/'}) # noqa
            
            await context.add_cookies(cookies)
            
        page = await context.new_page()
        
        # 注入 LocalStorage (如果 token 存在)
        if token:
            await page.goto(URL) # 先访问以设置域
            # 使用简单的字符串拼接避免 f-string 复杂性
            js_code = "localStorage.setItem('x_xhh_tokenid', '" + token + "');"
            js_code += "sessionStorage.setItem('x_xhh_tokenid', '" + token + "');"
            await page.evaluate(js_code)
            
        titles = await extract_titles(page, label)
        await browser.close()
        return titles

async def main():
    print("开始 Token 效果对比测试...")
    
    # 1. 无 Token (基准)
    s1 = await run_test(None, None, "【基准】无 Token (游客状态)")
    
    # 2. 假 Token
    s2 = await run_test("fake_token_invalid_123456", "fake_pkey", "【测试】假 Token")
    
    # 3. 真 Token
    s3 = await run_test(REAL_TOKEN, REAL_PKEY, "【测试】真 Token (从 .env 读取)")
    
    print("\n=== 结论分析 ===")
    
    # 比较 无 vs 假
    diff_1_2 = len(s1 & s2)
    print(f"无 Token vs 假 Token 重合度: {diff_1_2}/15")
    
    # 比较 假 vs 真
    diff_2_3 = len(s2 & s3)
    print(f"假 Token vs 真 Token 重合度: {diff_2_3}/15")
    
    if diff_2_3 > 10:
        print("-> 真 Token 居然和 假 Token 内容一样！")
        print("   结论：你的 Token 可能早已失效，或者 IP 被风控导致 Token 被忽略。")
    else:
        print("-> 真 Token 获取了完全不同的内容。")
        print("   结论：Token 生效了。当前获取的是 'C' 列表（个性化/降级版）。")

if __name__ == "__main__":
    asyncio.run(main())