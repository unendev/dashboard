/**
 * 解析各种格式的时间输入为秒数
 * 支持格式:
 * - "20" -> 20分钟 -> 1200秒 (纯数字默认分钟)
 * - "1h" -> 1小时 -> 3600秒
 * - "30m" -> 30分钟 -> 1800秒
 * - "1h30m" -> 1小时30分钟 -> 5400秒
 * 
 * @param input 用户输入字符串
 * @returns 秒数 (number) 或 undefined (解析失败)
 */
export const parseTimeInput = (input: string): number | undefined => {
    if (!input || !input.trim()) return undefined;

    // 纯数字：默认为分钟
    const minutesOnly = input.match(/^\s*(\d+)\s*$/);
    if (minutesOnly) {
        return parseInt(minutesOnly[1]) * 60;
    }

    // 混合格式：解析 h 和 m
    const hourMatch = input.match(/(\d+)h/i);
    const minMatch = input.match(/(\d+)m/i);

    if (hourMatch || minMatch) {
        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minMatch ? parseInt(minMatch[1]) : 0;
        return (hours * 60 + minutes) * 60;
    }

    return undefined;
};

/**
 * 格式化秒数为 HH:MM:SS
 * @param seconds 秒数
 * @returns 格式化后的字符串
 */
export const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (h > 0) {
        return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
};
