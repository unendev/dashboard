'use client';

import { useState } from 'react';

export default function DevAuthPage() {
  const [authMethod, setAuthMethod] = useState<'session' | 'super-admin' | 'api-key'>('session');
  const [result, setResult] = useState<{ status?: number; data?: unknown; error?: string; authMethod?: string; method?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    setResult(null);

    try {
      const headers: Record<string, string> = {};
      const url = '/api/example-auth';

      switch (authMethod) {
        case 'super-admin':
          headers['x-super-admin-key'] = 'dev-super-admin-2024';
          break;
        case 'api-key':
          headers['x-api-key'] = 'dev-api-key-2024';
          break;
        case 'session':
        default:
          // 使用NextAuth.js会话
          break;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data,
        authMethod
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : '请求失败'
      });
    } finally {
      setLoading(false);
    }
  };

  const testPost = async () => {
    setLoading(true);
    setResult(null);

    try {
      const headers: Record<string, string> = {};
      const url = '/api/example-auth';

      switch (authMethod) {
        case 'super-admin':
          headers['x-super-admin-key'] = 'dev-super-admin-2024';
          break;
        case 'api-key':
          headers['x-api-key'] = 'dev-api-key-2024';
          break;
        case 'session':
        default:
          // 使用NextAuth.js会话
          break;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          testData: '这是一个测试数据',
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      setResult({
        status: response.status,
        data,
        authMethod,
        method: 'POST'
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : '请求失败'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔐 开发环境认证测试工具
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              这个工具帮助你测试新的认证系统。支持多种认证方式：
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li><strong>NextAuth.js 会话认证</strong> - 标准的用户登录认证</li>
              <li><strong>超级管理员密钥认证</strong> - 开发环境专用，无需登录</li>
              <li><strong>API密钥认证</strong> - 向后兼容的认证方式</li>
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择认证方式：
            </label>
            <select
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value as 'session' | 'super-admin' | 'api-key')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="session">NextAuth.js 会话认证</option>
              <option value="super-admin">超级管理员密钥认证</option>
              <option value="api-key">API密钥认证</option>
            </select>
          </div>

          <div className="flex space-x-4 mb-6">
            <button
              onClick={testAuth}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '测试中...' : '测试 GET 请求'}
            </button>
            <button
              onClick={testPost}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '测试中...' : '测试 POST 请求'}
            </button>
          </div>

          {result && (
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                测试结果：
              </h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              💡 使用提示：
            </h3>
            <ul className="text-yellow-700 space-y-1">
              <li>• 超级管理员密钥仅在开发环境下有效</li>
              <li>• 生产环境下会自动禁用超级管理员功能</li>
              <li>• 会话认证的过期时间在开发环境下已延长至30天</li>
              <li>• 可以在API测试工具中使用相应的请求头进行测试</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🛠️ API测试工具配置：
            </h3>
            <div className="text-blue-700 space-y-2">
              <p><strong>Thunder Client / Postman 配置：</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>超级管理员：添加请求头 <code>x-super-admin-key: dev-super-admin-2024</code></li>
                <li>API密钥：添加请求头 <code>x-api-key: dev-api-key-2024</code></li>
                <li>会话认证：使用NextAuth.js的会话Cookie</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

