import { fetchFeed } from '../lib/rss.js';

async function test() {
  const config = {
    key: 'linuxdo_test',
    name: 'Linux.do Test',
    url: 'https://linux.do/latest.rss',
    type: 'frontier',
    enabled: true
  };

  console.log('Testing RSS Fetch for Linux.do via Proxy...');
  try {
    const items = await fetchFeed(config);
    console.log(`Success! Fetched ${items.length} items.`);
    if (items.length > 0) {
      console.log('Latest Item Title:', items[0].title);
      console.log('Latest Item Date:', items[0].isoDate);
    }
  } catch (error) {
    console.error('Fetch Failed:', error);
  }
}

test();
