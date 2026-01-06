#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小黑盒选择器调试脚本
目的：检查小黑盒首页当前的HTML结构，找出选择器是否失效
"""

import asyncio
import os
import json
import re
import sys
from pathlib import Path

# 添加linuxdo-scraper到路径
sys.path.insert(0, str(Path(__file__).parent.parent / 'linuxdo-scraper'))

from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from dotenv import load_dotenv

# 加载环境变量
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

HEYBOX_TOKEN_ID = os.getenv("HEYBOX_TOKEN_ID", "")
HEYBOX_HOME_URL = "https://www.xiaoheihe.cn/app/bbs/home"

async def debug_heybox_selectors():
    """调试小黑盒选择器"""
    
    print("\n" + "="*80)
    print("🔍 小黑盒选择器调试工具")
    print("="*80 + "\n")
    
    if not HEYBOX_TOKEN_ID:
        print("❌ 错误：HEYBOX_TOKEN_ID 未配置")
        return
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage']
        )
        
        page = await browser.new_page()
        
        try:
            # 1. 访问首页
            print("📍 步骤1：访问小黑盒首页...")
            await page.goto(HEYBOX_HOME_URL, wait_until='domcontentloaded', timeout=60000)
            print("✓ 页面加载完成\n")
            
            # 2. 注入Token
            print("📍 步骤2：注入Token...")
            await page.evaluate(f"""
                () => {{
                    const token = "{HEYBOX_TOKEN_ID}";
                    localStorage.setItem('x_xhh_tokenid', token);
                    sessionStorage.setItem('x_xhh_tokenid', token);
                    document.cookie = `x_xhh_tokenid=${{token}}; path=/; domain=.xiaoheihe.cn`;
                }}
            """)
            print("✓ Token注入完成\n")
            
            # 等待生效
            await asyncio.sleep(2)
            await page.reload(wait_until='domcontentloaded')
            await asyncio.sleep(3)
            print("✓ 页面已刷新\n")
            
            # 3. 获取页面HTML
            print("📍 步骤3：分析页面结构...\n")
            content = await page.content()
            
            # 4. 测试当前选择器
            print("🧪 测试当前选择器：")
            print("   选择器: a[href*=\"/app/bbs/link/\"]")
            
            links = await page.query_selector_all('a[href*="/app/bbs/link/"]')
            print(f"   找到的元素数量: {len(links)}")
            
            if len(links) > 0:
                print("   ✓ 选择器有效\n")
            else:
                print("   ❌ 选择器失效！需要寻找替代方案\n")
            
            # 5. 使用evaluate检查
            print("🧪 使用evaluate脚本检查：")
            posts_data = await page.evaluate("""
                () => {
                    const posts = [];
                    const links = document.querySelectorAll('a[href*="/app/bbs/link/"]');
                    
                    console.log('Found links:', links.length);
                    
                    links.forEach((link, index) => {
                        if (index >= 5) return;
                        posts.push({
                            href: link.href || link.getAttribute('href'),
                            text: link.textContent.trim(),
                            classes: link.className,
                            parent: link.parentElement?.tagName,
                            parentClass: link.parentElement?.className
                        });
                    });
                    
                    return posts;
                }
            """)
            print(f"   获取的帖子数据: {len(posts_data)} 条\n")
            
            if posts_data:
                print("   前3条示例:")
                for i, post in enumerate(posts_data[:3], 1):
                    print(f"   {i}. href: {post['href'][:60]}...")
                    print(f"      text: {post['text'][:80]}...")
                    print(f"      classes: {post['classes']}")
                    print()
            else:
                print("   ❌ 未找到任何帖子！\n")
                
                # 尝试寻找替代选择器
                print("🔍 尝试寻找替代选择器...\n")
                
                alt_selectors = [
                    ('a[href*="/app/bbs/"]', "包含/app/bbs/的所有链接"),
                    ('div.post', "class包含post的div"),
                    ('div[class*="post"]', "class包含post的元素"),
                    ('article', "article标签"),
                    ('[data-post-id]', "带data-post-id属性的元素"),
                ]
                
                for selector, description in alt_selectors:
                    elements = await page.query_selector_all(selector)
                    print(f"   {selector}")
                    print(f"   描述: {description}")
                    print(f"   找到: {len(elements)} 个元素")
                    if len(elements) > 0:
                        print(f"   ✓ 可能有效\n")
                    else:
                        print(f"   ✗ 无效\n")
            
            # 6. 输出页面快照（用于分析）
            print("📋 页面HTML快照（前2000字）:")
            print("-" * 80)
            snapshot = content[:2000]
            print(snapshot)
            print("\n" + "-" * 80)
            
            # 7. 保存完整HTML用于离线分析
            snapshot_file = Path("linuxdo-scraper/logs/heybox_page_snapshot.html")
            snapshot_file.parent.mkdir(parents=True, exist_ok=True)
            snapshot_file.write_text(content, encoding='utf-8')
            print(f"\n✓ 完整HTML已保存到: {snapshot_file}\n")
            
            # 8. 总结
            print("="*80)
            print("📊 调试总结")
            print("="*80)
            if len(posts_data) == 0 and len(links) == 0:
                print("""
⚠️  问题诊断：选择器无效

可能原因：
1. 小黑盒改变了HTML结构
2. 选择器的路径格式变化（例如：/app/bbs/link/ → /bbs/link/）
3. 帖子列表使用了动态加载（需要滚动或等待）
4. 需要额外的身份验证

建议：
1. 查看保存的HTML快照，找出新的选择器
2. 尝试动态加载：在提取前滚动页面
3. 检查Network选项卡中的API调用
4. 更新选择器后重新测试
                """)
            else:
                print(f"""
✅ 选择器有效

成功找到 {len(posts_data)} 条帖子数据
选择器可继续使用

建议：
检查提取逻辑中是否有其他问题
                """)
            print("="*80 + "\n")
            
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_heybox_selectors())
