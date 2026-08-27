import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/** 썸네일·이미지 상한. 프론트 `lib/media.ts` 와 맞춰 둔다. */
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
/** 쇼츠·롱폼 영상 상한. 프론트 `lib/media.ts` 와 맞춰 둔다. */
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

export type UploadKind = "image" | "video";

const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const VIDEO_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

const STORED_FILE_RE =
  /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm|mov|jpg|png|webp|gif)$/i;

export function uploadsDir() {
  const fromEnv = process.env.UPLOADS_PATH?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "uploads");
}

export function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir(), { recursive: true });
}

export function mimeToExt(
  kind: UploadKind,
  mime: string,
  originalName: string
): string | null {
  const table = kind === "image" ? IMAGE_MIME : VIDEO_MIME;
  if (table[mime]) return table[mime];
  const ext = path.extname(originalName).toLowerCase();
  if (kind === "image" && IMAGE_EXT.has(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  if (kind === "video" && VIDEO_EXT.has(ext)) return ext;
  return null;
}

export function newStoredName(ext: string) {
  return `${randomUUID()}${ext}`;
}

export function publicUploadUrl(filename: string) {
  return `/uploads/${filename}`;
}

export function isAllowedMediaUrl(
  value: string,
  kind: "image" | "video"
): boolean {
  if (STORED_FILE_RE.test(value)) {
    const ext = path.extname(value).toLowerCase();
    if (kind === "image") return IMAGE_EXT.has(ext) && ext !== ".jpeg";
    return VIDEO_EXT.has(ext);
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type MediaUrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: "empty" | "type" | "data-url" | "invalid" };

export function checkMediaUrl(
  value: unknown,
  kind: "image" | "video"
): MediaUrlCheck {
  if (value == null) return { ok: false, reason: "empty" };
  if (typeof value !== "string") return { ok: false, reason: "type" };
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.startsWith("data:")) return { ok: false, reason: "data-url" };
  if (isAllowedMediaUrl(trimmed, kind)) return { ok: true, url: trimmed };
  return { ok: false, reason: "invalid" };
}
