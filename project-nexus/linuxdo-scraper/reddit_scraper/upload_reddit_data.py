# upload_reddit_data.py - Reddit数据手动上传脚本
import asyncio
import os
import json
import glob
from datetime import datetime
from dotenv import load_dotenv
import asyncpg

# 加载环境变量
load_dotenv()
NEON_DB_URL = os.getenv("DATABASE_URL")

# --- 代理配置 ---
proxy_for_all = "http://127.0.0.1:10809"
os.environ['HTTP_PROXY'] = proxy_for_all
os.environ['HTTPS_PROXY'] = proxy_for_all
print(f"--- 脚本已配置使用 HTTP 代理: {proxy_for_all} ---")

# Windows 下将事件循环策略切换为 Selector
if os.name == 'nt':
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

async def connect_to_database_with_retry(max_retries=3, delay=5):
    """带重试机制的数据库连接"""
    for attempt in range(max_retries):
        try:
            print(f"尝试连接数据库 (第 {attempt + 1}/{max_retries} 次)...")
            conn = await asyncpg.connect(NEON_DB_URL, command_timeout=30)
            print("[OK] 数据库连接成功！")
            return conn
        except Exception as e:
            print(f"[ERROR] 第 {attempt + 1} 次连接失败: {e}")
            if attempt < max_retries - 1:
                print(f"等待 {delay} 秒后重试...")
                await asyncio.sleep(delay)
            else:
                raise e

async def create_or_update_table(conn):
    """创建或更新reddit_posts表结构"""
    try:
        # 先尝试删除旧表（如果需要的话）
        print("检查表结构...")
        
        # 创建完整的表结构
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS reddit_posts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                core_issue TEXT,
                key_info JSONB,
                post_type TEXT,
                value_assessment TEXT,
                subreddit TEXT,
                score INTEGER DEFAULT 0,
                num_comments INTEGER DEFAULT 0,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 检查并添加缺失的列
        columns_to_add = [
            ("subreddit", "TEXT"),
            ("score", "INTEGER DEFAULT 0"),
            ("num_comments", "INTEGER DEFAULT 0")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                await conn.execute(f"""
                    ALTER TABLE reddit_posts 
                    ADD COLUMN IF NOT EXISTS {col_name} {col_type};
                """)
                print(f"  [OK] 列 {col_name} 已确保存在")
            except Exception as e:
                # PostgreSQL 9.6+ 支持 IF NOT EXISTS，如果不支持则忽略错误
                if "already exists" not in str(e).lower():
                    print(f"  [WARN] 添加列 {col_name} 时出错: {e}")
        
        print("[OK] 数据库表结构检查完成")
        return True
    except Exception as e:
        print(f"[ERROR] 创建/更新表结构失败: {e}")
        return False

async def upload_json_file(conn, json_file_path):
    """上传单个JSON文件到数据库"""
    try:
        print(f"\n[FILE] 正在处理: {json_file_path}")
        
        with open(json_file_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        posts = json_data.get('posts', [])
        if not posts:
            print(f"  [WARN] 文件中没有帖子数据，跳过")
            return 0
        
        # 从meta获取时间戳
        meta = json_data.get('meta', {})
        generation_time_str = meta.get('generation_time', '')
        report_date = meta.get('report_date', '')
        
        if generation_time_str:
            try:
                timestamp = datetime.fromisoformat(generation_time_str.replace('Z', '+00:00'))
            except:
                timestamp = datetime.now()
        else:
            timestamp = datetime.now()
        
        print(f"  [INFO] 发现 {len(posts)} 条帖子")
        print(f"  [DATE] 报告日期: {report_date}")
        print(f"  [TIME] 时间戳: {timestamp}")
        
        success_count = 0
        for i, post in enumerate(posts):
            try:
                post_id = post.get('id', f"reddit_{i}")
                title = post.get('title', '无标题')
                url = post.get('url', '#')
                analysis = post.get('analysis', {})
                
                core_issue = analysis.get('core_issue')
                key_info = json.dumps(analysis.get('key_info', []))
                post_type = analysis.get('post_type')
                value_assessment = analysis.get('value_assessment')
                
                # Reddit特定字段
                subreddit = 'technology'  # 默认值
                score = 0
                num_comments = 0
                
                await conn.execute("""
                    INSERT INTO reddit_posts 
                    (id, title, url, core_issue, key_info, post_type, value_assessment, 
                     subreddit, score, num_comments, timestamp)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        url = EXCLUDED.url,
                        core_issue = EXCLUDED.core_issue,
                        key_info = EXCLUDED.key_info,
                        post_type = EXCLUDED.post_type,
                        value_assessment = EXCLUDED.value_assessment,
                        subreddit = EXCLUDED.subreddit,
                        score = EXCLUDED.score,
                        num_comments = EXCLUDED.num_comments,
                        timestamp = EXCLUDED.timestamp;
                """, post_id, title, url, core_issue, key_info, post_type, 
                value_assessment, subreddit, score, num_comments, timestamp)
                
                success_count += 1
                
            except Exception as e:
                print(f"  [ERROR] 插入帖子 {i+1} 失败: {e}")
                continue
        
        print(f"  [OK] 成功上传 {success_count}/{len(posts)} 条记录")
        return success_count
        
    except Exception as e:
        print(f"  [ERROR] 处理文件失败: {e}")
        return 0

async def upload_all_files():
    """批量上传所有JSON文件"""
    if not NEON_DB_URL:
        print("[ERROR] 未找到 DATABASE_URL 环境变量")
        return
    
    # 查找所有JSON文件
    json_files = glob.glob("data/reddit_technology_report_*.json")
    json_files.sort()
    
    if not json_files:
        print("[ERROR] 未找到任何JSON文件")
        return
    
    print(f"[*] 找到 {len(json_files)} 个JSON文件")
    print("=" * 60)
    
    conn = None
    try:
        # 连接数据库
        conn = await connect_to_database_with_retry(max_retries=3, delay=10)
        
        # 创建或更新表结构
        if not await create_or_update_table(conn):
            print("[ERROR] 表结构创建/更新失败，终止上传")
            return
        
        print("\n" + "=" * 60)
        print("开始批量上传...")
        print("=" * 60)
        
        total_success = 0
        total_files = 0
        
        for json_file in json_files:
            count = await upload_json_file(conn, json_file)
            total_success += count
            total_files += 1
        
        print("\n" + "=" * 60)
        print("[SUMMARY] 上传汇总:")
        print(f"  [FILES] 处理文件数: {total_files}")
        print(f"  [SUCCESS] 成功记录数: {total_success}")
        print("=" * 60)
        
        # 验证数据库中的记录数
        total_in_db = await conn.fetchval("SELECT COUNT(*) FROM reddit_posts")
        print(f"\n[DB] 数据库中总记录数: {total_in_db}")
        
        # 按日期统计
        print("\n[STATS] 按日期统计:")
        date_stats = await conn.fetch("""
            SELECT DATE(timestamp) as date, COUNT(*) as count
            FROM reddit_posts
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
            LIMIT 10
        """)
        
        for row in date_stats:
            print(f"  {row['date']}: {row['count']} 条")
        
        print("\n[OK] 所有数据上传完成！")
        
    except Exception as e:
        print(f"[ERROR] 上传过程出错: {e}")
        import traceback
        print(traceback.format_exc())
    finally:
        if conn:
            await conn.close()
            print("\n数据库连接已关闭")

async def main():
    print("=" * 60)
    print("Reddit 数据批量上传工具")
    print("=" * 60)
    await upload_all_files()

if __name__ == "__main__":
    asyncio.run(main())

