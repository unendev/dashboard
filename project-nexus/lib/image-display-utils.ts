/**
 * 图片显示策略工具函数
 * 用于根据图片比例和设备类型决定最佳显示方式
 */

export type ImageRatioType = 'vertical' | 'horizontal' | 'square'

export interface ImageDisplayStrategy {
  /** CSS object-fit 属性 */
  objectFit: 'contain' | 'cover'
  /** 最大高度 */
  maxHeight: string
  /** 是否应用缩放效果（仅移动端横图） */
  shouldScale: boolean
  /** 图片比例类型 */
  ratioType: ImageRatioType
  /** 建议加载宽度（像素），用于优化带宽 */
  recommendedWidth: number
}

/**
 * 计算图片宽高比
 */
export function getAspectRatio(image: { width?: number; height?: number }): number | null {
  if (!image.width || !image.height) return null
  return image.width / image.height
}

/**
 * 判断图片比例类型
 * @param aspectRatio 宽高比
 * @returns 图片类型：竖图/横图/方图
 */
export function getImageRatioType(aspectRatio: number | null): ImageRatioType {
  if (!aspectRatio) return 'square'
  
  // 竖图：宽高比 < 0.75 (如 9:16 = 0.5625)
  if (aspectRatio < 0.75) return 'vertical'
  
  // 横图：宽高比 > 1.3 (如 16:9 = 1.778)
  if (aspectRatio > 1.3) return 'horizontal'
  
  // 方图：0.75 <= 宽高比 <= 1.3
  return 'square'
}

/**
 * 计算建议加载宽度（用于优化带宽）
 * @param ratioType 图片比例类型
 * @param isMobile 是否为移动端
 * @returns 建议加载宽度（像素）
 */
function getRecommendedWidth(ratioType: ImageRatioType, isMobile: boolean): number {
  // 移动端屏幕一般不超过 640px
  if (isMobile) {
    if (ratioType === 'vertical') {
      return 640 // 竖图：全宽显示
    }
    if (ratioType === 'horizontal') {
      return 800 // 横图：稍大以支持放大效果
    }
    return 640 // 方图：标准宽度
  }
  
  // 桌面端
  if (ratioType === 'vertical') {
    return 800 // 竖图：中等尺寸
  }
  if (ratioType === 'horizontal') {
    return 1200 // 横图：大尺寸以保证清晰度
  }
  return 1000 // 方图：标准尺寸
}

/**
 * 获取图片显示策略
 * @param image 图片对象（包含宽高信息）
 * @param isMobile 是否为移动端
 * @returns 显示策略对象
 */
export function getImageDisplayStrategy(
  image: { width?: number; height?: number },
  isMobile: boolean = false
): ImageDisplayStrategy {
  const aspectRatio = getAspectRatio(image)
  const ratioType = getImageRatioType(aspectRatio)

  // 竖图策略：完整显示，不裁剪
  if (ratioType === 'vertical') {
    return {
      objectFit: 'contain',
      maxHeight: isMobile ? '70vh' : '500px',
      shouldScale: false,
      ratioType: 'vertical',
      recommendedWidth: getRecommendedWidth('vertical', isMobile)
    }
  }

  // 横图策略：移动端放大以提升可读性
  if (ratioType === 'horizontal') {
    return {
      objectFit: 'cover',
      maxHeight: isMobile ? '60vh' : '500px',
      shouldScale: isMobile, // 移动端轻微放大
      ratioType: 'horizontal',
      recommendedWidth: getRecommendedWidth('horizontal', isMobile)
    }
  }

  // 方图策略：标准裁剪显示
  return {
    objectFit: 'cover',
    maxHeight: isMobile ? '500px' : '500px',
    shouldScale: false,
    ratioType: 'square',
    recommendedWidth: getRecommendedWidth('square', isMobile)
  }
}

/**
 * 生成图片容器的 className
 * @param strategy 显示策略
 * @param baseClassName 基础类名
 * @returns 完整的类名字符串
 */
export function getImageClassName(
  strategy: ImageDisplayStrategy,
  baseClassName: string = ''
): string {
  const classes = [baseClassName]
  
  // 添加 object-fit 类
  classes.push(strategy.objectFit === 'contain' ? 'object-contain' : 'object-cover')
  
  // 添加缩放效果（仅移动端横图）
  if (strategy.shouldScale) {
    classes.push('scale-105')
  }
  
  return classes.filter(Boolean).join(' ')
}

