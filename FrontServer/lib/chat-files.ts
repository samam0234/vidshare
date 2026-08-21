"use client";

import type { ChatbotAttachment } from "@/types/content";

const MAX_TEXT_CHARS = 12000;
/** 비전 모델 입력용. 원본 그대로 보내면 요청이 너무 커진다. */
const MAX_IMAGE_EDGE = 1280;
const IMAGE_QUALITY = 0.82;

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

async function readPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) pages.push(`[p.${p}] ${line}`);
    if (pages.join("\n").length > MAX_TEXT_CHARS) break;
  }
  await doc.cleanup();
  return pages.join("\n").slice(0, MAX_TEXT_CHARS);
}

async function readDocxText(file: File) {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const out = await mammoth.extractRawText({ arrayBuffer: buf });
  return out.value.replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT_CHARS);
}

/** 긴 변을 MAX_IMAGE_EDGE로 줄이고 JPEG로 재인코딩한 dataURL을 준다. */
async function downscaleImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("캔버스를 만들 수 없습니다.");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
}

export async function fileToAttachment(file: File): Promise<ChatbotAttachment> {
  const mime = file.type || "application/octet-stream";
  const base: ChatbotAttachment = { name: file.name, mime, size: file.size };
  const ext = extOf(file.name);

  try {
    if (mime === "application/pdf" || ext === ".pdf") {
      const text = await readPdfText(file);
      return { ...base, text: text || "(PDF에서 글자를 찾지 못했습니다. 스캔본일 수 있습니다.)" };
    }

    if (
      ext === ".docx" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const text = await readDocxText(file);
      return { ...base, text: text || "(문서에서 글자를 찾지 못했습니다.)" };
    }

    if (
      mime.startsWith("text/") ||
      [".md", ".csv", ".json", ".txt", ".log", ".xml", ".yml", ".yaml"].includes(ext)
    ) {
      const text = (await file.text()).slice(0, MAX_TEXT_CHARS);
      return { ...base, text };
    }

    if (isImageMime(mime)) {
      const dataUrl = await downscaleImage(file);
      return { ...base, dataUrl };
    }
  } catch {
    return { ...base, text: `(${file.name} 을 읽지 못했습니다.)` };
  }

  return base;
}

/** dataURL을 백엔드가 기대하는 { mime, dataBase64 } 형태로 바꾼다. */
export function attachmentsToImages(files: ChatbotAttachment[]) {
  const out: Array<{ mime: string; dataBase64: string }> = [];
  for (const f of files) {
    if (!f.dataUrl) continue;
    const comma = f.dataUrl.indexOf(",");
    if (comma < 0) continue;
    const header = f.dataUrl.slice(0, comma);
    const mime = header.slice(5, header.indexOf(";")) || f.mime;
    out.push({ mime, dataBase64: f.dataUrl.slice(comma + 1) });
  }
  return out;
}
