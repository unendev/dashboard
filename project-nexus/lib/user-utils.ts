import crypto from 'crypto';

/**
 * 基于用户名生成固定的 Hash ID
 * 相同的用户名总是生成相同的 ID
 * 
 * @param userName - 用户名
 * @returns 格式为 "user-{hash}" 的固定 ID
 */
export function generateUserHashId(userName: string): string {
  const hash = crypto
    .createHash('md5')
    .update(userName.toLowerCase().trim())
    .digest('hex')
    .substring(0, 8);
  return `user-${hash}`;
}

/**
 * 基于用户名生成确定性 SVG 头像
 * 相同的用户名总是生成相同的头像
 * 
 * @param userName - 用户名
 * @returns SVG 字符串
 */
export function generateSVGAvatar(userName: string): string {
  const hash = crypto
    .createHash('md5')
    .update(userName.toLowerCase().trim())
    .digest('hex');
  
  // 从 hash 提取颜色参数
  const hue = parseInt(hash.substring(0, 6), 16) % 360;
  const saturation = 70 + (parseInt(hash.substring(6, 12), 16) % 30);
  const lightness = 50 + (parseInt(hash.substring(12, 18), 16) % 20);
  
  const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  // 获取用户名首字母
  const initials = userName
    .trim()
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  return `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="${bgColor}"/>
    <text x="20" y="26" font-size="16" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">
      ${initials}
    </text>
  </svg>`;
}

/**
 * 将 SVG 字符串转换为 Data URL
 * 可以直接用于 img src 或 CSS background-image
 * 
 * @param svgString - SVG 字符串
 * @returns Data URL 格式的字符串
 */
export function svgToDataUrl(svgString: string): string {
  const encoded = encodeURIComponent(svgString.trim());
  return `data:image/svg+xml;utf8,${encoded}`;
}

/**
 * 生成用户头像 Data URL（一步完成）
 * 
 * @param userName - 用户名
 * @returns Data URL 格式的 SVG 头像
 */
export function generateAvatarDataUrl(userName: string): string {
  const svg = generateSVGAvatar(userName);
  return svgToDataUrl(svg);
}
