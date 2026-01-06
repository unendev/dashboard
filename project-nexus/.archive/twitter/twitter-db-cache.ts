import { Prisma } from '@prisma/client';
import { TwitterData } from '@/app/components/features/widgets/TwitterCard';
import { prisma } from '@/lib/prisma';
const CACHE_DURATION_HOURS = 1;

interface UserWithTweets {
  twitterId: string;
  name: string;
  username: string;
  profileImageUrl: string | null;
  tweets: Array<{
    twitterId: string;
    text: string;
    createdAt: Date;
    publicMetrics: {
      retweet_count?: number;
      like_count?: number;
      reply_count?: number;
      quote_count?: number;
    };
    attachments: Record<string, unknown> | null;
    media: Array<{
      mediaKey: string;
      type: string;
      url: string | null;
      previewImageUrl: string | null;
      width: number | null;
      height: number | null;
      altText: string | null;
    }>;
  }>;
}

function formatDataForFrontend(userWithTweets: UserWithTweets | null): TwitterData {
  if (!userWithTweets) {
    return { data: [], includes: { users: [], media: [] } };
  }

  const users = [
    {
      id: userWithTweets.twitterId,
      name: userWithTweets.name,
      username: userWithTweets.username,
      profile_image_url: userWithTweets.profileImageUrl || '',
    },
  ];

  const tweets = userWithTweets.tweets.map((tweet) => ({
    id: tweet.twitterId,
    text: tweet.text,
    created_at: tweet.createdAt.toISOString(),
    public_metrics: tweet.publicMetrics,
    author_id: userWithTweets.twitterId,
    attachments: tweet.attachments,
  }));

  const media = userWithTweets.tweets.flatMap((tweet) =>
    tweet.media.map((m) => ({
      media_key: m.mediaKey,
      type: m.type,
      url: m.url,
      preview_image_url: m.previewImageUrl,
      width: m.width,
      height: m.height,
      alt_text: m.altText,
    }))
  );

  return {
    data: tweets,
    includes: {
      users,
      media,
    },
  };
}

export class TwitterDbCache {
  static async getCachedData(username: string, allowExpired: boolean = false): Promise<TwitterData | null> {
    try {
      const user = await prisma.twitterUser.findUnique({
        where: { username },
        include: {
          tweets: {
            include: {
              media: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (user && user.tweets.length > 0) {
        const firstTweet = user.tweets[0];
        if (allowExpired || firstTweet.expiresAt > new Date()) {
          console.log(`[DB Cache] Hit for user: ${username}${allowExpired ? ' (expired allowed)' : ''}`);
          return formatDataForFrontend(user as UserWithTweets);
        }
        console.log(`[DB Cache] Expired for user: ${username}`);
      }
    } catch (error) {
      console.error('[DB Cache] Error getting cached data:', error);
    }
    
    console.log(`[DB Cache] Miss for user: ${username}`);
    return null;
  }

  static async setCachedData(username: string, apiData: TwitterData): Promise<void> {
    const { data: tweets, includes } = apiData;
    if (!includes?.users || includes.users.length === 0) return;

    const apiUser = includes.users[0];
    const expiresAt = new Date(Date.now() + CACHE_DURATION_HOURS * 60 * 60 * 1000);

    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.twitterUser.upsert({
          where: { twitterId: apiUser.id },
          update: {
            username: apiUser.username,
            name: apiUser.name,
            profileImageUrl: apiUser.profile_image_url,
          },
          create: {
            twitterId: apiUser.id,
            username: apiUser.username,
            name: apiUser.name,
            profileImageUrl: apiUser.profile_image_url,
          },
        });

        const oldTweets = await tx.twitterTweet.findMany({
          where: { authorId: user.id },
          select: { id: true }
        });
        if (oldTweets.length > 0) {
            const oldTweetIds = oldTweets.map(t => t.id);
            await tx.twitterMedia.deleteMany({ where: { tweetId: { in: oldTweetIds } } });
            await tx.twitterTweet.deleteMany({ where: { id: { in: oldTweetIds } } });
        }

        for (const tweet of tweets) {
          const createdTweet = await tx.twitterTweet.create({
            data: {
              twitterId: tweet.id,
              text: tweet.text,
              createdAt: new Date(tweet.created_at),
              publicMetrics: tweet.public_metrics as Prisma.InputJsonValue,
              attachments: tweet.attachments as Prisma.InputJsonValue,
              authorId: user.id,
              expiresAt,
            },
          });

          if ((tweet.attachments as { media_keys?: string[] })?.media_keys && includes.media) {
            for (const key of (tweet.attachments as { media_keys: string[] }).media_keys) {
              const media = includes.media.find(m => m.media_key === key);
              if (media) {
                await tx.twitterMedia.create({
                  data: {
                    mediaKey: media.media_key,
                    tweetId: createdTweet.id,
                    type: media.type,
                    url: media.url,
                    previewImageUrl: media.preview_image_url,
                    width: media.width,
                    height: media.height,
                    altText: media.alt_text,
                  },
                });
              }
            }
          }
        }
      });
      console.log(`[DB Cache] Set cache for user: ${username}`);
    } catch (error) {
      console.error('[DB Cache] Error setting cached data:', error);
    }
  }
}


