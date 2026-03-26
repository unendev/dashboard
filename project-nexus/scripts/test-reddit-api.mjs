import { fetchRedditSubreddit } from '../lib/reddit.js';

async function test() {
  console.log('Testing Official Reddit API...');
  try {
    const items = await fetchRedditSubreddit('gamedev', 5);
    console.log(`Success! Fetched ${items.length} items from r/gamedev.`);
    if (items.length > 0) {
      console.log('Latest Post:', items[0].title);
      console.log('Score:', items[0].metadata?.score);
      console.log('Comments:', items[0].metadata?.num_comments);
    }
  } catch (error) {
    console.error('Reddit API Test Failed:', error);
  }
}

test();
