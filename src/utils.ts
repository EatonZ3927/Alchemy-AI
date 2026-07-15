// 支持的图片格式
export const IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
// 支持的视频格式
export const VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv', 'video/x-matroska', 'video/webm', 'video/mov', 'video/avi', 'video/mkv'];
// 最大上传文件数量
export const MAX_ATTACHED_FILES = 3;
// 单张图片最大 7 MB，确保 Base64 编码后低于百炼 10 MB 限制
export const MAX_IMAGE_FILE_SIZE_MB = 7;
export const MAX_IMAGE_FILE_SIZE = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;
// 单个视频最大 200 MB；视频仅在浏览器中抽帧，不直接上传原文件
export const MAX_VIDEO_FILE_SIZE_MB = 200;
export const MAX_VIDEO_FILE_SIZE = MAX_VIDEO_FILE_SIZE_MB * 1024 * 1024;
// 最大视频时长（秒）
export const MAX_VIDEO_DURATION = 30;

export function isSupportedImageFile(file: File): boolean {
  return IMAGE_FORMATS.includes(file.type) || file.type.startsWith('image/');
}

export function isSupportedVideoFile(file: File): boolean {
  return VIDEO_FORMATS.includes(file.type) || file.type.startsWith('video/');
}

export function isSupportedMediaFile(file: File): boolean {
  return isSupportedImageFile(file) || isSupportedVideoFile(file);
}

// 生成唯一 ID
export function generateId(): string {
  return Date.now().toString();
}

// 文件转 Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

// 获取视频时长
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        reject(new Error('无法读取有效的视频时长'));
        return;
      }
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('无法读取视频信息'));
    };
    video.src = URL.createObjectURL(file);
  });
}

// 从视频中提取帧
export function extractVideoFrames(file: File, numFrames: number = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const frames: string[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!Number.isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(video.src);
        reject(new Error('无法读取有效的视频时长'));
        return;
      }

      if (!ctx) {
        URL.revokeObjectURL(video.src);
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width <= 0 || canvas.height <= 0) {
        URL.revokeObjectURL(video.src);
        reject(new Error('无法读取有效的视频画面'));
        return;
      }

      const actualFrames = Math.min(numFrames, Math.ceil(duration / 5));
      const interval = duration / (actualFrames + 1);

      try {
        for (let i = 1; i <= actualFrames; i++) {
          const time = i * interval;
          await new Promise<void>((res, rej) => {
            const timeoutId = window.setTimeout(() => {
              video.onseeked = null;
              rej(new Error('视频帧提取超时'));
            }, 8000);

            video.onseeked = () => {
              window.clearTimeout(timeoutId);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
              frames.push(frameData);
              res();
            };

            video.currentTime = Math.min(time, Math.max(duration - 0.1, 0));
          });
        }

        URL.revokeObjectURL(video.src);
        resolve(frames);
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('无法加载视频'));
    };

    video.src = URL.createObjectURL(file);
  });
}
