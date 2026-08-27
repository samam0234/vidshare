import { Router } from "express";
import multer from "multer";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";
import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  ensureUploadsDir,
  mimeToExt,
  newStoredName,
  publicUploadUrl,
  uploadsDir,
  type UploadKind,
} from "../upload/files";

const router = Router();

function kindError(kind: UploadKind) {
  return kind === "image"
    ? "이미지 형식만 올릴 수 있습니다. (jpg, png, webp, gif)"
    : "영상 형식만 올릴 수 있습니다. (mp4, webm, mov)";
}

function makeMulter(kind: UploadKind) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        ensureUploadsDir();
        cb(null, uploadsDir());
      },
      filename: (_req, file, cb) => {
        const ext = mimeToExt(kind, file.mimetype, file.originalname);
        if (!ext) {
          cb(new HttpError(400, kindError(kind)), "");
          return;
        }
        cb(null, newStoredName(ext));
      },
    }),
    limits: {
      fileSize: kind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      const ext = mimeToExt(kind, file.mimetype, file.originalname);
      if (!ext) {
        cb(new HttpError(400, kindError(kind)));
        return;
      }
      cb(null, true);
    },
  });
}

function parseKind(raw: unknown): UploadKind {
  const value = String(raw ?? "").trim();
  if (value !== "image" && value !== "video") {
    throw new HttpError(400, "kind는 image 또는 video 여야 합니다.");
  }
  return value;
}

/** POST /api/uploads?kind=image|video  field: file */
router.post("/", (req, res, next) => {
  requireRequestUser(req);
  const kind = parseKind(req.query.kind);
  const upload = makeMulter(kind).single("file");
  upload(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          next(
            new HttpError(
              413,
              kind === "image"
                ? "이미지는 8MB 이하여야 합니다."
                : "영상은 100MB 이하여야 합니다."
            )
          );
          return;
        }
        next(new HttpError(400, err.message));
        return;
      }
      next(err);
      return;
    }
    if (!req.file) {
      next(new HttpError(400, "파일이 없습니다."));
      return;
    }
    res.status(201).json({
      success: true,
      data: {
        url: publicUploadUrl(req.file.filename),
        mime: req.file.mimetype,
        size: req.file.size,
        kind,
      },
    });
  });
});

export default router;
