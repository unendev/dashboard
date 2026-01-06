import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get current time in Beijing timezone (UTC+8)
 */
export function getBeijingTime(): Date {
  const now = new Date();
  // Create a date string in Beijing timezone
  const beijingTimeString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the Beijing time string back to a Date object
  const [datePart, timePart] = beijingTimeString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
}

/**
 * Convert a date to Beijing timezone string
 */
export function toBeijingTimeString(date: Date): string {
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
 * have passed since the last time the debounced function was invoked.
 *
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @returns Returns the new debounced function.
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisParameterType<T> | null = null;

  const debounced = function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    const later = () => {
      timeout = null;
      if (lastArgs) {
        func.apply(lastThis, lastArgs);
      }
      lastArgs = null;
      lastThis = null;
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };

  return debounced as (...args: Parameters<T>) => void;
}


/**
 * 带自动重试的 fetch 函数
 * 当网络请求失败时，会自动重试指定次数
 * 
 * @param url 请求URL
 * @param options fetch选项
 * @param maxRetries 最大重试次数，默认3次
 * @param retryDelay 重试间隔时间（毫秒），默认1000ms
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries: number = 3, 
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // 如果响应成功（2xx状态码），直接返回
      if (response.ok) {
        return response;
      }
      
      // 如果是服务器错误（5xx），可以重试
      if (response.status >= 500 && response.status < 600) {
        throw new Error(`服务器错误: ${response.status} ${response.statusText}`);
      }
      
      // 如果是客户端错误（4xx），不重试，直接返回
      return response;
      
    } catch (error) {
      lastError = error as Error;
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // 等待一段时间后重试
      console.log(`请求失败，${retryDelay}ms后重试 (第${attempt + 1}/${maxRetries + 1}次尝试):`, error);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // 每次重试后增加延迟时间（指数退避）
      retryDelay *= 1.5;
    }
  }
  
  throw lastError || new Error('未知错误');
}