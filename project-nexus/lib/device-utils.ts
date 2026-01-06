/**
 * 设备检测工具函数
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false; // 服务端渲染时返回false
  }
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

export function isSmallScreen(): boolean {
  const { width } = getViewportSize();
  return width < 768; // Tailwind's md breakpoint
}
