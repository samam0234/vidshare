import { sql as init } from "./0001_init";
import { sql as shortControls } from "./0002_short_controls";

export type Migration = { version: string; name: string; sql: string };

/**
 * 적용 순서대로 나열한다. **이미 배포된 항목은 고치지 말고** 새 번호를 덧붙인다.
 * (`.sql` 파일이 아니라 TS 모듈인 이유: `tsc` 빌드가 .sql 을 dist/ 로 복사하지 않는다)
 */
export const MIGRATIONS: Migration[] = [
  { version: "0001", name: "init", sql: init },
  { version: "0002", name: "short_controls", sql: shortControls },
];
