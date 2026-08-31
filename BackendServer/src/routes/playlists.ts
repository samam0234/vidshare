import { Router } from "express";
import {
  addPlaylistItem,
  createPlaylist,
  deletePlaylist,
  findAuthor,
  getPlaylistById,
  listPlaylistItems,
  listPlaylistsByOwner,
  removePlaylistItem,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

const TITLE_MAX = 60;

/** GET /api/playlists?ownerId= — 특정 유저의 재생목록 (공개) */
router.get("/", (req, res) => {
  const ownerId = String(req.query.ownerId ?? "").trim();
  if (!ownerId) throw new HttpError(400, "ownerId가 필요합니다.");
  const owner = findAuthor(ownerId);
  if (!owner) throw new HttpError(404, "User not found");
  res.json({ success: true, data: listPlaylistsByOwner(owner.id) });
});

/** POST /api/playlists  body: { title } — 로그인 필요 */
router.post("/", (req, res) => {
  const user = requireRequestUser(req);
  const { title } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new HttpError(400, "제목을 입력해 주세요.");
  }
  if (title.length > TITLE_MAX) {
    throw new HttpError(400, `제목은 ${TITLE_MAX}자 이하여야 합니다.`);
  }
  const playlist = createPlaylist(user.id, title.trim());
  res.status(201).json({ success: true, data: playlist });
});

/** GET /api/playlists/:id — 상세 + 담긴 쇼츠 (공개) */
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const playlist = getPlaylistById(id);
  if (!playlist) throw new HttpError(404, "Playlist not found");
  res.json({
    success: true,
    data: { ...playlist, items: listPlaylistItems(id) },
  });
});

/** DELETE /api/playlists/:id — 본인 것만 */
router.delete("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const removed = deletePlaylist(id, user.id);
  if (!removed) throw new HttpError(404, "Playlist not found");
  res.json({ success: true, data: { id } });
});

/** POST /api/playlists/:id/items  body: { shortId } — 본인 재생목록만 */
router.post("/:id/items", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const { shortId } = req.body ?? {};
  if (!shortId || typeof shortId !== "string") {
    throw new HttpError(400, "shortId가 필요합니다.");
  }
  const ok = addPlaylistItem(id, user.id, shortId);
  if (!ok) throw new HttpError(404, "Playlist or short not found");
  res.status(201).json({
    success: true,
    data: { ...getPlaylistById(id), items: listPlaylistItems(id) },
  });
});

/** DELETE /api/playlists/:id/items/:shortId — 본인 재생목록만 */
router.delete("/:id/items/:shortId", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const ok = removePlaylistItem(id, user.id, req.params.shortId);
  if (!ok) throw new HttpError(404, "Playlist not found");
  res.json({
    success: true,
    data: { ...getPlaylistById(id), items: listPlaylistItems(id) },
  });
});

export default router;
