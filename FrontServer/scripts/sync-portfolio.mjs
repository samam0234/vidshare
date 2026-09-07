/**
 * portfolio/site → FrontServer/public/portfolio 복사.
 *
 * 푸터의 "프로젝트 소개" 링크가 /portfolio/index.html 을 가리키기 때문에,
 * 사이트를 띄우기 전에 이 복사가 한 번 돌아 있어야 한다.
 * package.json 의 predev / prebuild / predeploy 가 자동으로 실행한다.
 *
 * 원본은 언제나 portfolio/site 다. public/portfolio 는 생성물이라 git 에서 무시한다.
 */
import { cp, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, "../../portfolio/site");
const DEST = path.resolve(here, "../public/portfolio");

try {
  await stat(SRC);
} catch {
  // 포트폴리오 폴더 없이 FrontServer 만 떼어 쓰는 경우가 있을 수 있다.
  // 링크는 404 가 되겠지만 앱 실행을 막을 이유는 없다.
  console.warn(`[portfolio] 원본이 없어 건너뜁니다: ${SRC}`);
  process.exit(0);
}

await rm(DEST, { recursive: true, force: true });
await cp(SRC, DEST, { recursive: true });
console.log(`[portfolio] ${path.relative(process.cwd(), DEST)} 갱신 완료`);
