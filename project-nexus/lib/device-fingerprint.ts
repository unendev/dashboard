/**
 * 设备指纹生成和管理
 * 用于区分同一用户在不同设备上的操作
 */

const DEVICE_ID_KEY = 'app_device_id';

/**
 * 生成设备指纹
 * 基于浏览器 UA、屏幕分辨率、时区等信息
 */
function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width,
    screen.height,
    screen.colorDepth,
  ];
  
  const fingerprint = components.join('|');
  // 简单的哈希函数
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 获取或创建设备 ID
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceFingerprint();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * 清除设备 ID（用于测试或重置）
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
}
