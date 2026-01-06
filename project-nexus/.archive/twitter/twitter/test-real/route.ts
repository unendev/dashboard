import { NextRequest, NextResponse } from 'next/server';

const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAEY14QEAAAAAgRSvzkQdsFffGg3JxfFHgCFqKnc%3Dz1d9S20iXUXNLJI8aaUZJa0sMUpvji0MNIfmvPVRlYAmG4q4eN';

// 测试真实Twitter API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'user';

    if (testType === 'user') {
      // 测试用户API
      const response = await fetch(
        'https://api.twitter.com/2/users/by/username/elonmusk?user.fields=id,name,username,profile_image_url,public_metrics',
        {
          headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return NextResponse.json({
          success: false,
          error: 'User API failed',
          status: response.status,
          details: errorData
        });
      }

      const data = await response.json();
      return NextResponse.json({
        success: true,
        data: data,
        message: 'User API working'
      });

    } else if (testType === 'tweets') {
      // 测试推文API
      const response = await fetch(
        'https://api.twitter.com/2/users/2244994945/tweets?max_results=3&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username,profile_image_url',
        {
          headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return NextResponse.json({
          success: false,
          error: 'Tweets API failed',
          status: response.status,
          details: errorData
        });
      }

      const data = await response.json();
      return NextResponse.json({
        success: true,
        data: data,
        message: 'Tweets API working'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid test type. Use "user" or "tweets"'
    });

  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

