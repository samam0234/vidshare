import express, { type NextFunction, type Request, type Response, type RouterOptions } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

const METHODS = ["get", "post", "put", "patch", "delete", "all"] as const;

/** 핸들러가 던지거나 reject 하면 next(err) 로 넘긴다. 에러 미들웨어(인자 4개)는 그대로 둔다. */
function wrap(handler: unknown): unknown {
  if (typeof handler !== "function" || handler.length === 4) return handler;
  const fn = handler as Handler;
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = fn(req, res, next);
      if (out && typeof (out as Promise<unknown>).then === "function") {
        (out as Promise<unknown>).catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

/**
 * `express.Router()` 와 같지만 async 핸들러의 실패를 에러 핸들러로 보낸다.
 *
 * Express 4 는 동기 throw 만 잡고, async 핸들러의 rejected promise 는 놓친다
 * (요청이 응답 없이 매달리고 unhandledRejection 이 난다). DB 가 Postgres(비동기)로
 * 바뀌면서 모든 라우트가 async 가 되었으므로 라우터 생성 지점에서 한 번에 감싼다.
 */
export function Router(options?: RouterOptions) {
  const router = express.Router(options);
  for (const method of METHODS) {
    const original = router[method].bind(router) as (...args: unknown[]) => unknown;
    (router as unknown as Record<string, unknown>)[method] = (...args: unknown[]) =>
      original(...args.map((a) => (Array.isArray(a) ? a.map(wrap) : wrap(a))));
  }
  return router;
}
