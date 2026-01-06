/**
 * 网络请求工具函数
 * 提供带重试机制的 fetch 封装
 */

/**
 * 增强版 fetch 重试函数
 * @param url 请求 URL
 * @param options fetch 选项
 * @param maxRetries 最大重试次数，默认 3 次
 * @param onRetry 重试回调函数，接收当前重试次数
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<Response> {
  const delays = [100, 500, 1000]; // 递增的重试延迟（毫秒）
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // 如果响应成功或者是客户端错误（4xx），不重试
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // 服务器错误（5xx）或其他错误，需要重试
      if (attempt < maxRetries) {
        const delay = delays[attempt] || 1000;
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        if (onRetry) {
          onRetry(attempt + 1, error);
        }
        
        console.warn(`请求失败 (尝试 ${attempt + 1}/${maxRetries}): ${url}`, error.message);
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      // 网络错误、超时等
      if (attempt < maxRetries) {
        const delay = delays[attempt] || 1000;
        const err = error instanceof Error ? error : new Error('Unknown error');
        
        if (onRetry) {
          onRetry(attempt + 1, err);
        }
        
        console.warn(`请求失败 (尝试 ${attempt + 1}/${maxRetries}): ${url}`, err.message);
        await sleep(delay);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error(`请求失败：已达到最大重试次数 (${maxRetries})`);
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的 JSON POST 请求
 */
export async function postJSON<T = unknown>(
  url: string,
  data: Record<string, unknown>,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    maxRetries,
    onRetry
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败 (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

/**
 * 带重试的 JSON PUT 请求
 */
export async function putJSON<T = unknown>(
  url: string,
  data: Record<string, unknown>,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const response = await fetchWithRetry(
    url,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    maxRetries,
    onRetry
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败 (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

/**
 * 带重试的 DELETE 请求
 */
export async function deleteRequest(
  url: string,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<void> {
  const response = await fetchWithRetry(
    url,
    {
      method: 'DELETE',
    },
    maxRetries,
    onRetry
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`删除失败 (${response.status}): ${errorText}`);
  }
}

/**
 * 安全的 JSON 解析
 * 检查 content-type 避免解析 HTML 错误页面
 */
export async function safeParseJSON<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  // 检查是否是 JSON 响应
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    
    // 如果是 HTML 错误页面，提取更友好的错误信息
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(
        `API 返回了 HTML 页面而不是 JSON (${response.status} ${response.statusText})`
      );
    }
    
    // 其他非 JSON 响应
    throw new Error(
      `API 返回了非 JSON 格式数据 (Content-Type: ${contentType || 'unknown'})`
    );
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      `JSON 解析失败: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 安全的 GET JSON 请求
 * 自动检查响应类型并处理错误
 */
export async function safeFetchJSON<T = unknown>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const response = await fetchWithRetry(url, options, maxRetries, onRetry);
  
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    
    // 尝试解析错误信息
    if (contentType?.includes('application/json')) {
      try {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || `请求失败 (${response.status})`
        );
      } catch (jsonError) {
        // JSON 解析失败，使用文本
        const text = await response.text();
        throw new Error(`请求失败 (${response.status}): ${text.slice(0, 100)}`);
      }
    } else {
      // 非 JSON 错误响应
      const text = await response.text();
      throw new Error(
        `请求失败 (${response.status}): ${text.includes('<!DOCTYPE') ? 'HTML 错误页面' : text.slice(0, 100)}`
      );
    }
  }
  
  return safeParseJSON<T>(response);
}

/**
 * 安全的 POST JSON 请求（替代现有的 postJSON）
 */
export async function safePostJSON<T = unknown>(
  url: string,
  data: Record<string, unknown>,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  return safeFetchJSON<T>(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    maxRetries,
    onRetry
  );
}

/**
 * 安全的 PUT JSON 请求（替代现有的 putJSON）
 */
export async function safePutJSON<T = unknown>(
  url: string,
  data: Record<string, unknown>,
  maxRetries: number = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  return safeFetchJSON<T>(
    url,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
    maxRetries,
    onRetry
  );
}


