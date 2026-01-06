#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reddit 评论采集器
基于 PRAW 库获取 Reddit 帖子的完整评论树并存储到数据库

依赖:
- praw: Reddit API 包装库
- asyncpg: PostgreSQL 异步驱动
- python-dotenv: 环境变量管理

环境变量:
- REDDIT_CLIENT_ID: Reddit 应用的 Client ID
- REDDIT_CLIENT_SECRET: Reddit 应用的 Client Secret  
- REDDIT_USER_AGENT: 用户代理字符串 (格式: platform:app_id:version (by /u/username))
- REDDIT_REFRESH_TOKEN: 可选，用于需要认证的操作
- DATABASE_URL: PostgreSQL 数据库连接 URL
"""

import asyncio
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import praw
from dotenv import load_dotenv
import asyncpg
import re

# --- 配置日志 ---
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/reddit_comments_scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- 配置 ---
load_dotenv()

# Reddit API 配置
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET") 
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT")
REDDIT_REFRESH_TOKEN = os.getenv("REDDIT_REFRESH_TOKEN")  # 可选

# 数据库配置
NEON_DB_URL = os.getenv("DATABASE_URL")
if NEON_DB_URL and '?' in NEON_DB_URL:
    NEON_DB_URL = NEON_DB_URL.split('?')[0]
    logger.info("已清理DATABASE_URL中的查询参数")

# 验证必需的环境变量
required_vars = ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USER_AGENT", "DATABASE_URL"]
missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    logger.error(f"缺少必需的环境变量: {', '.join(missing_vars)}")
    exit(1)

class RedditCommentsScraper:
    """Reddit 评论采集器"""
    
    def __init__(self):
        """初始化 Reddit API 客户端"""
        try:
            # 初始化 PRAW 客户端
            kwargs = {
                'client_id': REDDIT_CLIENT_ID,
                'client_secret': REDDIT_CLIENT_SECRET,
                'user_agent': REDDIT_USER_AGENT,
            }
            
            # 如果有 refresh_token，添加到配置中
            if REDDIT_REFRESH_TOKEN:
                kwargs['refresh_token'] = REDDIT_REFRESH_TOKEN
            
            self.reddit = praw.Reddit(**kwargs)
            
            # 测试连接
            logger.info(f"Reddit API 连接成功，只读模式: {self.reddit.read_only}")
            
        except Exception as e:
            logger.error(f"初始化 Reddit 客户端失败: {e}")
            raise
    
    async def get_posts_without_comments(self, limit: int = 50) -> List[Dict[str, Any]]:
        """从数据库获取还没有采集评论的 Reddit 帖子"""
        try:
            conn = await asyncpg.connect(NEON_DB_URL)
            
            # 查询没有评论数据的帖子
            query = """
            SELECT DISTINCT p.id, p.url, p.title
            FROM posts p 
            WHERE p.id LIKE 'reddit_%' 
            AND NOT EXISTS (
                SELECT 1 FROM reddit_comments rc 
                WHERE rc.post_id = p.id
            )
            ORDER BY p.timestamp DESC 
            LIMIT $1
            """
            
            rows = await conn.fetch(query, limit)
            await conn.close()
            
            posts = []
            for row in rows:
                # 从 URL 中提取 Reddit 帖子 ID
                reddit_id = self._extract_reddit_id_from_url(row['url'])
                if reddit_id:
                    posts.append({
                        'db_id': row['id'],
                        'reddit_id': reddit_id,
                        'url': row['url'],
                        'title': row['title']
                    })
            
            logger.info(f"从数据库获取到 {len(posts)} 个待采集评论的帖子")
            return posts
            
        except Exception as e:
            logger.error(f"获取帖子列表失败: {e}")
            return []
    
    def _extract_reddit_id_from_url(self, url: str) -> Optional[str]:
        """从 Reddit URL 中提取帖子 ID"""
        # Reddit URL 格式: https://www.reddit.com/r/subreddit/comments/POST_ID/title/
        match = re.search(r'/comments/([a-zA-Z0-9]+)/', url)
        return match.group(1) if match else None
    
    def fetch_comments_for_post(self, reddit_id: str, title: str) -> List[Dict[str, Any]]:
        """获取指定帖子的所有评论"""
        try:
            logger.info(f"开始获取帖子 {reddit_id} 的评论: {title}")
            
            # 获取 submission 对象
            submission = self.reddit.submission(id=reddit_id)
            
            # 展开所有评论（包括被折叠的）
            submission.comments.replace_more(limit=None)
            
            # 扁平化评论树并收集数据
            comments = []
            for comment in submission.comments.list():
                try:
                    # 跳过已删除的评论
                    if hasattr(comment, 'author') and comment.author and hasattr(comment, 'body'):
                        comment_data = {
                            'id': comment.id,
                            'author': str(comment.author) if comment.author else '[deleted]',
                            'body': comment.body,
                            'score': getattr(comment, 'score', 0),
                            'created_utc': datetime.fromtimestamp(comment.created_utc),
                            'parent_id': comment.parent_id,
                            'depth': getattr(comment, 'depth', 0),
                            'is_submitter': getattr(comment, 'is_submitter', False),
                            'permalink': f"https://reddit.com{comment.permalink}" if hasattr(comment, 'permalink') else '',
                        }
                        comments.append(comment_data)
                except Exception as e:
                    logger.warning(f"处理评论时出错: {e}")
                    continue
            
            logger.info(f"帖子 {reddit_id} 获取到 {len(comments)} 条评论")
            return comments
            
        except Exception as e:
            logger.error(f"获取帖子 {reddit_id} 评论失败: {e}")
            return []
    
    async def save_comments_to_db(self, post_db_id: str, reddit_id: str, comments: List[Dict[str, Any]]) -> bool:
        """保存评论到数据库"""
        if not comments:
            logger.info(f"帖子 {reddit_id} 无评论需要保存")
            return True
        
        try:
            conn = await asyncpg.connect(NEON_DB_URL)
            
            # 注意：reddit_comments 表由 Prisma 迁移管理（prisma/migrations/20251024_add_reddit_comments_model）
            # 无需手动创建表
            
            # 批量插入评论
            insert_query = """
            INSERT INTO reddit_comments 
            (comment_id, post_id, reddit_post_id, author, body, score, created_utc, 
             parent_id, depth, is_submitter, permalink, scraped_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (comment_id) DO UPDATE SET
                score = EXCLUDED.score,
                scraped_at = EXCLUDED.scraped_at
            """
            
            scraped_at = datetime.now()
            for comment in comments:
                await conn.execute(
                    insert_query,
                    comment['id'],
                    post_db_id,
                    reddit_id,
                    comment['author'],
                    comment['body'],
                    comment['score'],
                    comment['created_utc'],
                    comment['parent_id'],
                    comment['depth'],
                    comment['is_submitter'],
                    comment['permalink'],
                    scraped_at
                )
            
            await conn.close()
            logger.info(f"成功保存 {len(comments)} 条评论到数据库")
            return True
            
        except Exception as e:
            logger.error(f"保存评论到数据库失败: {e}")
            return False
    
    async def _ensure_comments_table_exists(self, conn):
        """
        [已弃用] 表创建由 Prisma 迁移管理
        
        保留此方法作为备份和文档，显示表的 schema。
        实际表创建通过运行: npx prisma migrate deploy
        """
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS reddit_comments (
            comment_id VARCHAR PRIMARY KEY,
            post_id VARCHAR NOT NULL,
            reddit_post_id VARCHAR NOT NULL,
            author VARCHAR,
            body TEXT,
            score INTEGER DEFAULT 0,
            created_utc TIMESTAMP,
            parent_id VARCHAR,
            depth INTEGER DEFAULT 0,
            is_submitter BOOLEAN DEFAULT FALSE,
            permalink TEXT,
            scraped_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (post_id) REFERENCES reddit_posts(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_reddit_comments_post_id ON reddit_comments(post_id);
        CREATE INDEX IF NOT EXISTS idx_reddit_comments_reddit_post_id ON reddit_comments(reddit_post_id);
        CREATE INDEX IF NOT EXISTS idx_reddit_comments_created_utc ON reddit_comments(created_utc);
        """
        await conn.execute(create_table_sql)
    
    async def scrape_comments_batch(self, max_posts: int = 10) -> Dict[str, int]:
        """批量采集评论"""
        logger.info(f"开始批量采集评论，最多处理 {max_posts} 个帖子")
        
        # 获取待处理的帖子
        posts = await self.get_posts_without_comments(max_posts)
        
        if not posts:
            logger.info("没有需要采集评论的帖子")
            return {'processed': 0, 'success': 0, 'failed': 0}
        
        stats = {'processed': 0, 'success': 0, 'failed': 0}
        
        for post in posts:
            try:
                stats['processed'] += 1
                logger.info(f"处理帖子 {stats['processed']}/{len(posts)}: {post['title']}")
                
                # 获取评论
                comments = self.fetch_comments_for_post(post['reddit_id'], post['title'])
                
                # 保存到数据库
                if await self.save_comments_to_db(post['db_id'], post['reddit_id'], comments):
                    stats['success'] += 1
                else:
                    stats['failed'] += 1
                
                # 避免 API 限流，添加延迟
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"处理帖子 {post['reddit_id']} 时出错: {e}")
                stats['failed'] += 1
                continue
        
        logger.info(f"批量采集完成: 处理 {stats['processed']} 个帖子，成功 {stats['success']} 个，失败 {stats['failed']} 个")
        return stats

async def main():
    """主函数"""
    try:
        scraper = RedditCommentsScraper()
        
        # 执行批量采集
        stats = await scraper.scrape_comments_batch(max_posts=20)
        
        # 输出结果
        print(f"\n=== 采集结果统计 ===")
        print(f"处理帖子数: {stats['processed']}")
        print(f"成功数: {stats['success']}")
        print(f"失败数: {stats['failed']}")
        
        if stats['failed'] > 0:
            exit(1)  # 如果有失败，退出码为1
            
    except Exception as e:
        logger.error(f"主程序执行失败: {e}")
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())


















