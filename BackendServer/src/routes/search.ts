import { Router } from "express";
import {
  listShorts,
  searchAuthors,
  searchCommunity,
  searchLongform,
} from "../data/store";

const router = Router();

const EMPTY = { shorts: [], longform: [], community: [], users: [] };

/** GET /api/search?q=&limit= — 쇼츠·롱폼·커뮤니티·유저 통합 검색 */
router.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.json({ success: true, data: { query: "", ...EMPTY } });
    return;
  }

  const raw = Number(req.query.limit);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 50) : 20;

  res.json({
    success: true,
    data: {
      query: q,
      shorts: listShorts(q).slice(0, limit),
      longform: searchLongform(q, limit),
      community: searchCommunity(q, limit),
      users: searchAuthors(q, limit),
    },
  });
});

export default router;
