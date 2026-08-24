import { Router } from "express";
import {
  createActivityNotification,
  createInquiry,
  getInquiryById,
  listFaqs,
  listInquiries,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/support/faq */
router.get("/faq", (_req, res) => {
  res.json({ success: true, data: listFaqs() });
});

/** GET /api/support/inquiries */
router.get("/inquiries", (req, res) => {
  const user = requireRequestUser(req);
  res.json({ success: true, data: listInquiries(user.id) });
});

/** GET /api/support/inquiries/:id */
router.get("/inquiries/:id", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const item = getInquiryById(id, user.id);
  if (!item) throw new HttpError(404, "Inquiry not found");
  res.json({ success: true, data: item });
});

/** POST /api/support/inquiries  body: { subject, body } */
router.post("/inquiries", (req, res) => {
  const user = requireRequestUser(req);
  const { subject, body } = req.body ?? {};
  if (!subject || typeof subject !== "string" || !subject.trim()) {
    throw new HttpError(400, "subject is required");
  }
  if (!body || typeof body !== "string" || !body.trim()) {
    throw new HttpError(400, "body is required");
  }

  const item = createInquiry(user.id, {
    subject: subject.trim(),
    body: body.trim(),
  });
  createActivityNotification(user.id, {
    category: "system",
    message: `고객센터 문의 #${String(item.id).padStart(3, "0")} 을 보냈습니다.`,
    href: `/support/${item.id}`,
  });
  res.status(201).json({ success: true, data: item });
});

export default router;
