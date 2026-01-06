/**
 * 设备管理器
 * 用于识别和跟踪不同设备/浏览器窗口
 */

const DEVICE_ID_KEY = 'nexus_device_id';
const DEVICE_NAME_KEY = 'nexus_device_name';

/**
 * 生成唯一的设备ID
 */
function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取或创建设备ID
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    
    // 默认设备名称
    const deviceName = `设备_${new Date().toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    localStorage.setItem(DEVICE_NAME_KEY, deviceName);
  }
  
  return deviceId;
}

/**
 * 获取设备名称
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return '服务器';
  }
  
  return localStorage.getItem(DEVICE_NAME_KEY) || '未知设备';
}

/**
 * 设置设备名称
 */
export function setDeviceName(name: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

/**
 * 重置设备ID（用于测试多设备场景）
 */
export function resetDeviceId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_NAME_KEY);
}



