import { prisma } from '@/lib/prisma';

export interface TwitterUserData {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
}

export interface TwitterTweetData {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  author_id: string;
}

export class TwitterCacheService {
  private static readonly CACHE_DURATION_HOURS = 1; // 缓存1小时

  /**
   * 获取缓存的用户信息
   */
  static async getCachedUser(username: string): Promise<TwitterUserData | null> {
    try {
      const cachedUser = await prisma.twitterUser.findUnique({
        where: { username },
        include: {
          tweets: {
            where: {
              expiresAt: {
                gt: new Date()
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          }
        }
      });

      if (!cachedUser) {
        return null;
      }

      return {
        id: cachedUser.twitterId,
        name: cachedUser.name,
        username: cachedUser.username,
        profile_image_url: cachedUser.profileImageUrl || undefined,
        public_metrics: cachedUser.publicMetrics as {
          followers_count?: number;
          following_count?: number;
          tweet_count?: number;
          listed_count?: number;
        }
      };
    } catch (error) {
      console.error('Error getting cached user:', error);
      return null;
    }
  }

  /**
   * 获取缓存的推文
   */
  static async getCachedTweets(userId: string, maxResults: number = 5): Promise<TwitterTweetData[]> {
    try {
      const cachedTweets = await prisma.twitterTweet.findMany({
        where: {
          author: {
            twitterId: userId
          },
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          author: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: maxResults
      });

      return cachedTweets.map(tweet => ({
        id: tweet.twitterId,
        text: tweet.text,
        created_at: tweet.createdAt.toISOString(),
        public_metrics: {
          retweet_count: (tweet.publicMetrics as { retweet_count?: number })?.retweet_count || 0,
          like_count: (tweet.publicMetrics as { like_count?: number })?.like_count || 0,
          reply_count: (tweet.publicMetrics as { reply_count?: number })?.reply_count || 0,
          quote_count: (tweet.publicMetrics as { quote_count?: number })?.quote_count || 0,
        },
        author_id: tweet.author.twitterId
      }));
    } catch (error) {
      console.error('Error getting cached tweets:', error);
      return [];
    }
  }

  /**
   * 缓存用户信息
   */
  static async cacheUser(userData: TwitterUserData, userId?: string): Promise<void> {
    try {
      await prisma.twitterUser.upsert({
        where: { twitterId: userData.id },
        update: {
          username: userData.username,
          name: userData.name,
          profileImageUrl: userData.profile_image_url,
          publicMetrics: userData.public_metrics,
          userId: userId
        },
        create: {
          twitterId: userData.id,
          username: userData.username,
          name: userData.name,
          profileImageUrl: userData.profile_image_url,
          publicMetrics: userData.public_metrics,
          userId: userId
        }
      });
    } catch (error) {
      console.error('Error caching user:', error);
    }
  }

  /**
   * 缓存推文
   */
  static async cacheTweets(tweets: TwitterTweetData[], authorId: string): Promise<void> {
    try {
      // 首先确保作者存在
      const author = await prisma.twitterUser.findUnique({
        where: { twitterId: authorId }
      });

      if (!author) {
        console.error('Author not found for caching tweets:', authorId);
        return;
      }

      // 批量插入推文
      const tweetData = tweets.map(tweet => ({
        twitterId: tweet.id,
        text: tweet.text,
        createdAt: new Date(tweet.created_at),
        publicMetrics: tweet.public_metrics,
        authorId: author.id,
        expiresAt: new Date(Date.now() + this.CACHE_DURATION_HOURS * 60 * 60 * 1000)
      }));

      await prisma.twitterTweet.createMany({
        data: tweetData,
        skipDuplicates: true
      });
    } catch (error) {
      console.error('Error caching tweets:', error);
    }
  }

  /**
   * 检查缓存是否有效
   */
  static async isCacheValid(username: string): Promise<boolean> {
    try {
      const user = await prisma.twitterUser.findUnique({
        where: { username },
        include: {
          tweets: {
            where: {
              expiresAt: {
                gt: new Date()
              }
            },
            take: 1
          }
        }
      });

      return !!(user && user.tweets.length > 0);
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * 清理过期缓存
   */
  static async cleanExpiredCache(): Promise<void> {
    try {
      await prisma.twitterTweet.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  static async getCacheStats(): Promise<{
    totalUsers: number;
    totalTweets: number;
    validTweets: number;
    expiredTweets: number;
  }> {
    try {
      const [totalUsers, totalTweets, validTweets, expiredTweets] = await Promise.all([
        prisma.twitterUser.count(),
        prisma.twitterTweet.count(),
        prisma.twitterTweet.count({
          where: {
            expiresAt: {
              gt: new Date()
            }
          }
        }),
        prisma.twitterTweet.count({
          where: {
            expiresAt: {
              lt: new Date()
            }
          }
        })
      ]);

      return {
        totalUsers,
        totalTweets,
        validTweets,
        expiredTweets
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalUsers: 0,
        totalTweets: 0,
        validTweets: 0,
        expiredTweets: 0
      };
    }
  }
}
