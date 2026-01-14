
import OSS from 'ali-oss';
import { env } from './env';

let ossClient: OSS | null = null;

function getOssClient() {
    if (ossClient) return ossClient;

    const accessKeyId = env.ALIYUN_OSS_ACCESS_KEY_ID;
    const accessKeySecret = env.ALIYUN_OSS_ACCESS_KEY_SECRET;
    const bucket = env.ALIYUN_OSS_BUCKET;
    const region = env.ALIYUN_OSS_REGION;

    if (!accessKeyId || !accessKeySecret || !bucket || !region) {
        throw new Error('Missing Aliyun OSS configuration');
    }

    ossClient = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket,
        secure: true, // Use HTTPS
    });

    return ossClient;
}

export async function uploadBufferToOss(buffer: Buffer, filename: string, mimeType?: string): Promise<string> {
    const client = getOssClient();
    const path = `generated-images/${filename}`;

    try {
        const result = await client.put(path, buffer, {
            mime: mimeType
        });

        // Check if CDN URL is configured
        const cdnUrl = env.ALIYUN_OSS_CDN_URL;
        if (cdnUrl) {
            // Ensure cdnUrl doesn't have trailing slash if path implies it, or handle cleanly
            const baseUrl = cdnUrl.endsWith('/') ? cdnUrl : `${cdnUrl}/`;
            // Clean leading slash from path if present (usually not for OSS keys)
            return `${baseUrl}${path}`;
        }

        // Fallback to standard OSS URL
        return result.url;
    } catch (error) {
        console.error('OSS Upload Error:', error);
        throw new Error('Failed to upload image to OSS');
    }
}
