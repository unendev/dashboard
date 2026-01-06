-- 为reddit_posts表添加新字段
ALTER TABLE reddit_posts 
ADD COLUMN IF NOT EXISTS title_cn TEXT,
ADD COLUMN IF NOT EXISTS subreddit TEXT,
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS num_comments INTEGER;

-- 添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit ON reddit_posts(subreddit);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_timestamp ON reddit_posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_value ON reddit_posts(value_assessment);


