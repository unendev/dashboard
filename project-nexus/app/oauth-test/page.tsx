'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function OAuthTestPage() {
  const [providers, setProviders] = useState<Record<string, { name: string; id: string }> | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    fetchProviders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">OAuth 配置检查</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">环境变量检查：</h2>
          <div className="bg-gray-800 p-4 rounded">
            <p>GOOGLE_CLIENT_ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ 已配置' : '❌ 未配置'}</p>
            <p>GOOGLE_CLIENT_SECRET: {process.env.GOOGLE_CLIENT_SECRET ? '✅ 已配置' : '❌ 未配置'}</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">可用的认证提供商：</h2>
          <div className="bg-gray-800 p-4 rounded">
            {providers ? (
              Object.values(providers).map((provider: { name: string; id: string }) => (
                <div key={provider.name} className="mb-2">
                  <p>{provider.name}: {provider.id}</p>
                </div>
              ))
            ) : (
              <p>加载中...</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">测试Google OAuth：</h2>
          <button
            onClick={() => signIn('google')}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            使用Google登录
          </button>
        </div>
      </div>
    </div>
  );
}

