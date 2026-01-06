import { NextResponse } from 'next/server';

// 示例 mock data
const mockTrack = {
  isPlaying: true,
  trackName: 'Yesterday',
  artist: 'The Beatles',
  album: 'Help!',
  albumArtUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e7/Help_album_cover.jpg',
  source: 'Spotify'
};

export async function GET() {
  // In the future, this will be replaced with actual Spotify API calls.
  // For now, we just return the mock data.
  return NextResponse.json(mockTrack);
}