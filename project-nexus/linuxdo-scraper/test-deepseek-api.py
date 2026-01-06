#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepSeek API 测试脚本
测试 API 连接性和功能，用于验证替换 Gemini 后的可行性
"""

import os
import json
import requests
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

def print_section(title):
    """打印分隔符"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_deepseek_connection():
    """测试 DeepSeek API 基础连接"""
    print_section("测试 1: API 连接测试")
    
    if not DEEPSEEK_API_KEY:
        print("❌ 错误: 未找到 DEEPSEEK_API_KEY 环境变量")
        print("请在 .env 文件中配置: DEEPSEEK_API_KEY=your_key")
        return False
    
    print(f"✓ API Key 已配置 (长度: {len(DEEPSEEK_API_KEY)} 字符)")
    
    try:
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
                        "content": "Hello, please reply 'Connection successful' in Chinese."
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 100,
            },
            timeout=30,
        )
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ API 连接成功!")
            print(f"响应: {content}")
            return True
        else:
            print(f"❌ API 请求失败: {response.status_code}")
            print(f"错误信息: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False

def test_chinese_translation():
    """测试中文翻译功能"""
    print_section("测试 2: 中文翻译功能")
    
    test_text = """
    The new framework allows developers to build scalable applications 
    with minimal configuration. It includes built-in support for TypeScript 
    and modern JavaScript features.
    """
    
    print(f"原文: {test_text.strip()}")
    print("\n翻译中...")
    
    try:
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
                        "content": f"请将以下英文文本翻译成中文，保持原意：\n\n{test_text}"
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 500,
            },
            timeout=30,
        )
        
        if response.status_code == 200:
            data = response.json()
            translation = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"\n✅ 翻译成功:")
            print(f"译文: {translation}")
            return True
        else:
            print(f"❌ 翻译失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 翻译失败: {e}")
        return False

def test_json_output():
    """测试 JSON 格式输出（模拟 Reddit 爬虫场景）"""
    print_section("测试 3: JSON 格式输出（Reddit 帖子分析）")
    
    test_post = {
        "title": "Godot 4.2 Released - Major Performance Improvements",
        "content": "The Godot team has released version 4.2 with significant performance improvements..."
    }
    
    print(f"测试帖子: {test_post['title']}")
    print("\n分析中...")
    
    prompt = f"""请分析以下Reddit帖子，并返回JSON格式的结果。

标题：{test_post['title']}
内容：{test_post['content']}

请严格按照以下JSON格式返回（不要包含markdown代码块标记）：
{{
  "title_cn": "中文标题翻译",
  "core_issue": "核心问题总结",
  "key_info": ["关键信息1", "关键信息2"],
  "post_type": "技术教程/问题求助/经验分享/其他",
  "value_assessment": "高/中/低"
}}
"""
    
    try:
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
                "max_tokens": 800,
            },
            timeout=30,
        )
        
        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # 清理可能的 markdown 代码块标记
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # 尝试解析 JSON
            try:
                analysis = json.loads(content)
                print(f"\n✅ JSON 解析成功:")
                print(json.dumps(analysis, ensure_ascii=False, indent=2))
                
                # 验证必需字段
                required_fields = ['title_cn', 'core_issue', 'key_info', 'post_type', 'value_assessment']
                missing_fields = [f for f in required_fields if f not in analysis]
                
                if missing_fields:
                    print(f"\n⚠️  警告: 缺少字段 {missing_fields}")
                    return False
                else:
                    print(f"\n✓ 所有必需字段都存在")
                    return True
                    
            except json.JSONDecodeError as e:
                print(f"\n❌ JSON 解析失败: {e}")
                print(f"原始内容: {content[:200]}...")
                return False
        else:
            print(f"❌ 请求失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

def main():
    """主测试流程"""
    print("\n" + "🚀"*30)
    print("  DeepSeek API 测试脚本")
    print("  用于验证替换 Gemini 后的功能")
    print("🚀"*30)
    
    results = {
        "连接测试": test_deepseek_connection(),
        "中文翻译": test_chinese_translation(),
        "JSON输出": test_json_output(),
    }
    
    # 总结
    print_section("测试总结")
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name}: {status}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\n🎉 所有测试通过! DeepSeek API 可以正常使用。")
        print("可以安全地替换 Gemini API。")
        return True
    else:
        print("\n⚠️  部分测试失败，请检查配置后重试。")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

