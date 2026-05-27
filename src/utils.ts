// 支持的图片格式
export const IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
// 支持的视频格式
export const VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv', 'video/x-matroska', 'video/webm', 'video/mov', 'video/avi', 'video/mkv'];
// 最大上传文件数量
export const MAX_ATTACHED_FILES = 3;
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
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
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

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const frames: string[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const actualFrames = Math.min(numFrames, Math.ceil(duration / 5));
      const interval = duration / (actualFrames + 1);

      for (let i = 1; i <= actualFrames; i++) {
        const time = i * interval;
        await new Promise<void>((res) => {
          video.currentTime = time;
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            frames.push(frameData);
            res();
          };
        });
      }

      URL.revokeObjectURL(video.src);
      resolve(frames);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('无法加载视频'));
    };

    video.src = URL.createObjectURL(file);
  });
}
