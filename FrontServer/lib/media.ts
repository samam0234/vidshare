import { api } from "./api";

/** BackendServer/src/upload/files.ts 와 동일해야 한다. */
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);
const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function extOf(file: File) {
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
}

export function isImageFile(file: File) {
  return IMAGE_MIME.has(file.type) || IMAGE_EXT.has(extOf(file));
}

export function isVideoFile(file: File) {
  return VIDEO_MIME.has(file.type) || VIDEO_EXT.has(extOf(file));
}

/** `/uploads/...` 는 API 호스트를 붙이고, 외부 URL·blob·data URL은 그대로 둔다. */
export function mediaUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }
  const base = api.baseUrl;
  return src.startsWith("/") ? `${base}${src}` : `${base}/${src}`;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}
