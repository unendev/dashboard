import { useState } from 'react';
import imageCompression from 'browser-image-compression';

export interface UploadResult {
  originalUrl: string;
  signedUrl: string;
}

interface UploadOptions {
  onProgress?: (progress: number) => void;
}

export function useOssUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File, options?: UploadOptions): Promise<UploadResult> => {
    setIsUploading(true);
    try {
      // 1. 图片压缩优化
      const compressionOptions = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp' as const,
      };
      
      const compressedFile = await imageCompression(file, compressionOptions);
      const filename = `${file.name.split('.').slice(0, -1).join('.') || 'image'}.webp`;

      // 2. 获取上传签名
      const signatureUrl = new URL('/api/upload/oss/signature', window.location.origin);
      signatureUrl.searchParams.set('filename', filename);
      signatureUrl.searchParams.set('contentType', 'image/webp');
      
      const signatureRes = await fetch(signatureUrl.toString());
      const signatureData = await signatureRes.json();
      
      if (signatureData.error) {
        // OSS未配置兜底
        return { originalUrl: '', signedUrl: '' };
      }

      // 3. 构建表单并上传
      const formData = new FormData();
      Object.entries(signatureData).forEach(([k, v]) => {
        if (typeof v === 'string') formData.append(k, v);
      });
      formData.append('file', compressedFile, filename);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) options?.onProgress?.(Math.round((e.loaded / e.total) * 100));
        });
        xhr.onload = () => resolve();
        xhr.onerror = () => reject();
        xhr.open('POST', signatureData.endpoint);
        xhr.send(formData);
      });

      const baseUrl = (signatureData.cdnUrl || signatureData.endpoint).replace(/\/+$/, '');
      const originalUrl = `${baseUrl}/${signatureData.key.replace(/^\/+/, '')}`;
      
      // 4. 获取预览签名
      const signRes = await fetch('/api/upload/oss/sign-url', {
        method: 'POST',
        body: JSON.stringify({ url: originalUrl }),
      });
      const { signedUrl } = await signRes.json();

      return { originalUrl, signedUrl: signedUrl || originalUrl };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
}

