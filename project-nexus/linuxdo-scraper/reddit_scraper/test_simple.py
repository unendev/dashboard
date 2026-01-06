import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import logging
import re
import json

# 简单配置
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_reddit_posts():
    """获取Reddit RSS数据"""
    RSS_URL = "https://www.reddit.com/r/technology/.rss?sort=hot"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    try:
        response = requests.get(RSS_URL, headers=headers, timeout=20)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        
        posts = []
        for i, entry in enumerate(root.findall('{http://www.w3.org/2005/Atom}entry')):
            if i >= 5:  # 只取前5个
                break
                
            title_tag = entry.find('{http://www.w3.org/2005/Atom}title')
            link_tag = entry.find('{http://www.w3.org/2005/Atom}link')
            
            if title_tag is not None and link_tag is not None:
                posts.append({
                    "title": title_tag.text,
                    "link": link_tag.get('href'),
                    "author": "Reddit",
                    "content_preview": "测试内容"
                })
                logger.info(f"获取帖子 {i+1}: {title_tag.text[:50]}...")
        
        logger.info(f"成功获取 {len(posts)} 个帖子")
        return posts
        
    except Exception as e:
        logger.error(f"获取Reddit数据失败: {e}")
        return []

if __name__ == "__main__":
    posts = fetch_reddit_posts()
    if posts:
        logger.info("测试成功！Reddit RSS数据可以正常获取")
        for i, post in enumerate(posts, 1):
            logger.info(f"{i}. {post['title']}")
    else:
        logger.error("测试失败！无法获取Reddit数据")
