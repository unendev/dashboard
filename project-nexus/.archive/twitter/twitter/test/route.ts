import { NextResponse } from 'next/server';

const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAEY14QEAAAAAgRSvzkQdsFffGg3JxfFHgCFqKnc%3Dz1d9S20iXUXNLJI8aaUZJa0sMUpvji0MNIfmvPVRlYAmG4q4eN';

// 测试Twitter API连接和Bearer Token
export async function GET() {
  try {
    console.log('Testing Twitter API connection...');
    
    // 测试1: 验证Bearer Token
    const testResponse = await fetch('https://api.twitter.com/2/tweets/search/recent?query=hello&max_results=10', {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Test API Response Status:', testResponse.status);
    console.log('Test API Response Headers:', Object.fromEntries(testResponse.headers.entries()));

    if (!testResponse.ok) {
      const errorData = await testResponse.text();
      console.error('Test API Error:', errorData);
      
      return NextResponse.json({
        success: false,
        error: 'Bearer Token test failed',
        status: testResponse.status,
        statusText: testResponse.statusText,
        details: errorData
      });
    }

    const testData = await testResponse.json();
    console.log('Test API Success:', testData);

    // 测试2: 获取用户信息
    const userResponse = await fetch('https://api.twitter.com/2/users/by/username/elonmusk?user.fields=id,name,username', {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('User API Response Status:', userResponse.status);

    if (!userResponse.ok) {
      const userErrorData = await userResponse.text();
      console.error('User API Error:', userErrorData);
      
      return NextResponse.json({
        success: false,
        error: 'User API test failed',
        status: userResponse.status,
        statusText: userResponse.statusText,
        details: userErrorData,
        tweetTest: 'passed'
      });
    }

    const userData = await userResponse.json();
    console.log('User API Success:', userData);

    return NextResponse.json({
      success: true,
      message: 'All tests passed',
      tweetTest: testData,
      userTest: userData
    });

  } catch (error) {
    console.error('Test Error:', error);
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
